(()=>{
  const style=document.createElement('style');
  style.textContent=`
    /* Light mode only: keep the exact-vacancy Ready state crisp and obviously actionable. */
    html[data-om-theme="light"] #tracker .focusCard.exactTracked{
      border-color:#c9dc8a!important;
      box-shadow:0 10px 28px rgba(63,98,18,.07)!important;
    }
    html[data-om-theme="light"] #tracker .focusCard.exactTracked:before{
      background:linear-gradient(180deg,#b9ee3f,#35b99a)!important;
    }
    html[data-om-theme="light"] #tracker .exactTrackBadge{
      background:#f2f8df!important;
      border-color:#cbdc93!important;
      color:#48620d!important;
    }

    /* Application Studio completion pills. */
    html[data-om-theme="light"] #tracker .focusTask.studioSynced.done{
      background:#eefbf7!important;
      border-color:#8fdccb!important;
      color:#0f6b5e!important;
    }
    html[data-om-theme="light"] #tracker .focusTask.studioSynced.done span,
    html[data-om-theme="light"] #tracker .focusTask.studioSynced.done label{
      color:#0f6b5e!important;
    }
    html[data-om-theme="light"] #tracker .focusTask.studioSynced.done input{
      accent-color:#0f766e!important;
      opacity:1!important;
    }

    /* Submission action should never look disabled in light mode. */
    html[data-om-theme="light"] #tracker .markSubmitted,
    html[data-om-theme="light"] #tracker .submissionRecord{
      background:#e9fbf6!important;
      border-color:#66cdb8!important;
      color:#0b6658!important;
      opacity:1!important;
      box-shadow:0 1px 0 rgba(15,118,110,.04)!important;
    }
    html[data-om-theme="light"] #tracker .markSubmitted:hover,
    html[data-om-theme="light"] #tracker .submissionRecord:hover{
      background:#dff8f1!important;
      border-color:#3ab89f!important;
      color:#07584d!important;
    }

    /* Official provider link: secondary, but still clearly interactive. */
    html[data-om-theme="light"] #tracker .exactOfficial{
      display:inline-flex;
      align-items:center;
      justify-content:center;
      background:#f4f9e5!important;
      border-color:#bfd47a!important;
      color:#3f5710!important;
      opacity:1!important;
    }
    html[data-om-theme="light"] #tracker .exactOfficial:hover{
      background:#edf6d5!important;
      border-color:#a9c653!important;
      color:#304509!important;
    }

    /* Keep the ready stage and progress ring visually strong against white cards. */
    html[data-om-theme="light"] #tracker .focusCard.exactTracked .focusStage,
    html[data-om-theme="light"] #tracker .focusCard.exactTracked .focusStage select{
      color:#1f2937!important;
    }
    html[data-om-theme="light"] #tracker .focusCard.exactTracked .focusPct{
      color:#111827!important;
    }

    /* Preserve hierarchy: the application-pack CTA remains the strongest action. */
    html[data-om-theme="light"] #tracker .prepareExact,
    html[data-om-theme="light"] #tracker .viewApplicationPack{
      opacity:1!important;
    }
  `;
  document.head.appendChild(style);
})();