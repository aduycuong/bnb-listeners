"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type ResearchHtmlReportProps = {
  html: string;
};

/** Minimum iframe height before the embedded document reports its own size. */
const MIN_IFRAME_HEIGHT = 600;

/**
 * CSS injected only into the live preview so body/html do not stretch to the
 * iframe viewport (which would inflate scrollHeight and cause a resize loop).
 */
const HEIGHT_FIX_CSS = `<style id="__research-height-fix">
html,body{margin:0;padding:0;height:auto!important;min-height:0!important;overflow:hidden!important}
</style>`;

/**
 * Small script injected only into the live preview (never the download) so the
 * sandboxed document can report its height to the parent for auto-resizing.
 * The iframe runs at a unique origin (no `allow-same-origin`), so `postMessage`
 * is the only channel available.
 *
 * Measures the bottom edge of body children instead of scrollHeight so the
 * reported size tracks content, not the iframe viewport.
 */
const HEIGHT_REPORTER = `<script>
(function(){
  function measure(){
    var body=document.body,h=0;
    for(var i=0;i<body.children.length;i++){
      var el=body.children[i];
      if(el.tagName==='SCRIPT'||el.id==='__research-height-fix')continue;
      var r=el.getBoundingClientRect();
      h=Math.max(h,r.bottom+window.scrollY);
    }
    if(h===0){
      var de=document.documentElement;
      h=Math.max(body.offsetHeight,de.offsetHeight);
    }
    return Math.ceil(h);
  }
  var resizeObserver;
  function send(){try{parent.postMessage({__researchHtmlHeight:measure()},'*');}catch(e){}}
  function bodyChildren(){
    return Array.prototype.filter.call(document.body.children,function(el){
      return el.tagName!=='SCRIPT'&&el.id!=='__research-height-fix';
    });
  }
  function observeContent(){
    if(!window.ResizeObserver)return;
    if(!resizeObserver){
      try{resizeObserver=new ResizeObserver(send);}catch(e){return;}
    }
    bodyChildren().forEach(function(el){resizeObserver.observe(el);});
  }
  window.addEventListener('load',function(){send();observeContent();});
  if(window.MutationObserver){
    try{
      new MutationObserver(function(mutations){
        send();
        for(var i=0;i<mutations.length;i++){
          if(mutations[i].type==='childList'){observeContent();return;}
        }
      }).observe(document.body,{childList:true,subtree:true,attributes:true,characterData:true});
    }catch(e){}
  }
  setTimeout(send,300);setTimeout(send,1200);
})();
</script>`;

export function downloadResearchHtmlReport(runId: string, html: string): void {
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `research-report-${runId}.html`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function injectHeightReporter(html: string): string {
  const withCss = /<\/head>/i.test(html)
    ? html.replace(/<\/head>/i, `${HEIGHT_FIX_CSS}</head>`)
    : `${HEIGHT_FIX_CSS}${html}`;

  if (/<\/body>/i.test(withCss)) {
    return withCss.replace(/<\/body>/i, `${HEIGHT_REPORTER}</body>`);
  }
  return `${withCss}${HEIGHT_REPORTER}`;
}

export function ResearchHtmlReport({ html }: ResearchHtmlReportProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [height, setHeight] = useState(MIN_IFRAME_HEIGHT);

  const srcDoc = useMemo(() => injectHeightReporter(html), [html]);

  useEffect(() => {
    setHeight(MIN_IFRAME_HEIGHT);
  }, [html]);

  useEffect(() => {
    function onMessage(event: MessageEvent) {
      if (event.source !== iframeRef.current?.contentWindow) {
        return;
      }
      const value = (event.data as { __researchHtmlHeight?: unknown })
        ?.__researchHtmlHeight;
      if (typeof value !== "number" || !Number.isFinite(value)) {
        return;
      }

      const nextHeight = Math.max(MIN_IFRAME_HEIGHT, Math.ceil(value) + 16);
      setHeight((current) => (nextHeight === current ? current : nextHeight));
    }

    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  return (
    <iframe
      ref={iframeRef}
      title="Research presentation"
      srcDoc={srcDoc}
      sandbox="allow-scripts"
      className="w-full rounded-lg border bg-white"
      style={{ height }}
    />
  );
}
