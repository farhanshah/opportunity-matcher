import {db} from '../lib/db.js';
import {ukDeliveryWindow,discoveryDigest} from '../lib/daily-discovery-email.js';

const authorised=req=>Boolean(process.env.CRON_SECRET) &&
  req.headers.authorization==='Bearer '+process.env.CRON_SECRET;
const configured=()=>Boolean(process.env.RESEND_API_KEY) &&
  /^[^@\s]+@oppmatcher\.tech$/i.test(process.env.WELCOME_FROM_EMAIL||'') &&
  /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(process.env.DISCOVERY_REPORT_TO_EMAIL||'');

export default async function handler(req,res){
  res.setHeader('Cache-Control','no-store');
  if(req.method!=='GET')return res.status(405).json({ok:false,error:'Method not allowed'});
  if(!authorised(req))return res.status(401).json({ok:false,error:'Unauthorized'});
  const {day,hour,shouldRun}=ukDeliveryWindow();
  if(!shouldRun)return res.status(200).json({ok:true,skipped:true,reason:'Outside UK morning window',hour});
  if(!configured())return res.status(200).json({ok:false,configured:false,
    message:'Daily digest requires a verified sender and a private recipient configuration.'});
  let claimed=false;
  const sql=db();
  try{
    await sql`
      INSERT INTO opportunity_daily_digest_delivery(report_date,status)
      VALUES(${day}::date,'queued')
      ON CONFLICT(report_date) DO NOTHING
    `;
    const [row]=await sql`
      UPDATE opportunity_daily_digest_delivery
      SET status='sending',attempts=attempts+1,last_attempt_at=now()
      WHERE report_date=${day}::date AND sent_at IS NULL AND attempts<4
        AND next_attempt_at<=now()
        AND (status IN ('queued','failed') OR
             (status='sending' AND last_attempt_at<now()-interval '25 minutes'))
      RETURNING attempts
    `;
    if(!row)return res.status(200).json({ok:true,skipped:true,
      reason:'Report already sent, sending, or awaiting retry'});
    claimed=true;

    const officialRuns=await sql`
      SELECT status,scanned_sources,found_links,checked_details,new_published,
        withheld,already_existing,source_errors,started_at
      FROM opportunity_discovery_runs
      WHERE (started_at AT TIME ZONE 'Europe/London')::date=${day}::date
      ORDER BY started_at DESC LIMIT 8
    `;
    const worldRuns=await sql`
      SELECT status,queries_attempted,results_found,new_leads,matched_official_hosts,
        provider_errors,started_at
      FROM opportunity_web_search_runs
      WHERE (started_at AT TIME ZONE 'Europe/London')::date=${day}::date
      ORDER BY started_at DESC LIMIT 4
    `;
    const verificationRuns=await sql`
      SELECT status,inspected,published_new,needs_evidence,needs_source_review,provider_errors
      FROM opportunity_web_verification_runs
      WHERE (started_at AT TIME ZONE 'Europe/London')::date=${day}::date
      ORDER BY started_at DESC LIMIT 5
    `;
    const officialCandidates=await sql`
      SELECT title,provider FROM opportunity_discovery_candidates
      WHERE (detected_at AT TIME ZONE 'Europe/London')::date=${day}::date
        AND status='needs_evidence'
      ORDER BY detected_at DESC LIMIT 6
    `;
    const publishedOpportunities=await sql`
      SELECT title,provider FROM (
        SELECT title,provider,detected_at AS published_at
        FROM opportunity_discovery_candidates
        WHERE (detected_at AT TIME ZONE 'Europe/London')::date=${day}::date
          AND status='published'
        UNION ALL
        SELECT title,COALESCE(verification_evidence->>'registered_provider','Official provider') AS provider,
          verification_checked_at AS published_at
        FROM opportunity_web_leads
        WHERE (verification_checked_at AT TIME ZONE 'Europe/London')::date=${day}::date
          AND verification_status='published'
      ) candidates ORDER BY published_at DESC LIMIT 6
    `;
    const worldLeads=await sql`
      SELECT title,search_region FROM opportunity_web_leads
      WHERE (first_seen_at AT TIME ZONE 'Europe/London')::date=${day}::date
        AND review_status='unverified'
      ORDER BY first_seen_at DESC LIMIT 6
    `;

    // Checking a provider page is not the same as verifying its programme
    // conditions. Keep the two counts separate in the daily email.
    const [catalogueHealth]=await sql`
      SELECT
        count(*)::int AS total_records,
        count(*) FILTER (WHERE last_recheck_at >= now()-interval '24 hours')::int AS rechecked_24h,
        count(*) FILTER (WHERE last_verified_at >= now()-interval '30 days')::int AS verified_30d,
        count(*) FILTER (WHERE last_recheck_at IS NULL)::int AS never_checked,
        count(*) FILTER (WHERE last_recheck_outcome LIKE 'needs_evidence:%')::int AS needs_evidence,
        count(*) FILTER (WHERE last_recheck_outcome LIKE 'retry_needed:%')::int AS retry_needed
      FROM opportunities
    `;
    const [sourceListingStats]=await sql`
      SELECT count(*)::int AS published_pages,
        count(*) FILTER (WHERE created_at>now()-interval '24 hours')::int AS added_last_24h
      FROM worldwide_source_listings
      WHERE source_status='source_confirmed'
        AND verified_page_at>now()-interval '30 days'
    `;
    const [governmentFeedStats]=await sql`
      SELECT
        count(*)::int AS runs,
        count(*) FILTER(WHERE status='completed')::int AS completed,
        COALESCE(sum(recorded) FILTER(WHERE status IN ('completed','partial')),0)::int AS official_source_records,
        COALESCE(sum(errors),0)::int AS errors
      FROM opportunity_official_feed_runs
      WHERE provider='grantsgov' AND started_at>=now()-interval '24 hours'
    `;
    const [supplementalFeedStats]=await sql`
      SELECT
        count(*) FILTER(WHERE provider='official_provider_links' AND status='completed')::int AS official_links_runs,
        COALESCE(sum(fetched) FILTER(WHERE provider='official_provider_links' AND status='completed'),0)::int AS official_link_leads,
        COALESCE(sum(recorded) FILTER(WHERE provider='official_provider_links' AND status='completed'),0)::int AS new_official_link_leads,
        count(*) FILTER(WHERE provider='exact_internships' AND status='completed')::int AS internship_runs,
        COALESCE(sum(fetched) FILTER(WHERE provider='exact_internships' AND status='completed'),0)::int AS exact_vacancies_checked,
        COALESCE(sum(recorded) FILTER(WHERE provider='exact_internships' AND status='completed'),0)::int AS new_internship_publications,
        COALESCE(sum(errors) FILTER(WHERE provider IN ('official_provider_links','exact_internships')),0)::int AS additional_errors
      FROM opportunity_official_feed_runs
      WHERE started_at>=now()-interval '24 hours'
    `;
    const message=discoveryDigest({day,officialRuns,worldRuns,verificationRuns,
      officialCandidates,publishedOpportunities,worldLeads,catalogueHealth,
      sourceListingStats,governmentFeedStats,supplementalFeedStats});
    const response=await fetch('https://api.resend.com/emails',{
      method:'POST',signal:AbortSignal.timeout(15000),
      headers:{
        Authorization:'Bearer '+process.env.RESEND_API_KEY,
        'Content-Type':'application/json',
        'Idempotency-Key':'oppmatcher-daily-discovery-'+day
      },
      body:JSON.stringify({
        from:'OppMatcher <'+process.env.WELCOME_FROM_EMAIL+'>',
        to:[process.env.DISCOVERY_REPORT_TO_EMAIL],
        subject:message.subject,html:message.html,text:message.text
      })
    });
    const payload=await response.json().catch(()=>({}));
    if(!response.ok||!payload.id)throw Error('Email provider HTTP '+response.status);
    await sql`
      UPDATE opportunity_daily_digest_delivery
      SET status='sent',sent_at=now(),provider_message_id=${String(payload.id)},
        last_error=NULL
      WHERE report_date=${day}::date AND sent_at IS NULL
    `;
    return res.status(200).json({ok:true,status:'sent',date:day,
      statistics:message.statistics});
  }catch(err){
    console.error('Discovery digest send failed',String(err?.message||err).slice(0,150));
    if(claimed){
      try{
        await sql`
          UPDATE opportunity_daily_digest_delivery
          SET status='failed',last_error=${String(err?.message||err).slice(0,160)},
            next_attempt_at=now()+interval '35 minutes'
          WHERE report_date=${day}::date AND sent_at IS NULL
        `;
      }catch(logError){
        console.error('Discovery digest failure tracking unavailable',
          String(logError?.message||logError).slice(0,100));
      }
    }
    return res.status(500).json({ok:false,error:'Daily digest not delivered'});
  }
}
