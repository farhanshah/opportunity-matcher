export function healthFindings(x){
 const issues=[];
 if(Number(x.official_discovery)<1)issues.push('Official-source discovery did not complete in the last 24 hours');
 if(Number(x.worldwide_discovery)<1)issues.push('Worldwide search did not complete in the last 24 hours');
 if(Number(x.worldwide_verification)<1)issues.push('Worldwide verification did not complete in the last 24 hours');
 if(x.official_grants_api!==null&&x.official_grants_api!==undefined&&Number(x.official_grants_api)<1)
  issues.push('Grants.gov official API discovery did not complete in the last 36 hours');
 if(Number(x.digest_sent)<1)issues.push('Daily discovery email not recorded as sent in the last 24 hours');
 if(Number(x.due_records)>0&&Number(x.catalogue_rechecks)<1)issues.push('Catalogue verification has due records but no successful check attempt');
 return issues;
}
