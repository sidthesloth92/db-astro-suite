import{i as c,D as l,ɵ as d,R as p,a as e,d as i,b as t,c as n}from"./index-D-j5sRSr.js";import{C as g,F as m,a as f}from"./warp-speed-loader.component-iVldfliQ.js";const r=class r{constructor(){const a=c(l);let o=a.querySelector('link[rel="canonical"]');o||(o=a.createElement("link"),o.setAttribute("rel","canonical"),a.head.appendChild(o)),o.setAttribute("href","https://dbastrosuite.com/dossier/file-grouper")}};r.ɵfac=function(o){return new(o||r)},r.ɵcmp=d({type:r,selectors:[["dba-hub-file-grouper-dossier"]],decls:67,vars:0,consts:[[1,"dossier-container"],[1,"stars-overlay"],[1,"nebula-overlay"],[1,"scanlines"],[1,"content"],[1,"top-nav"],["routerLink","/",1,"back-link"],[1,"arrow"],[1,"mission-id"],[1,"dossier-header"],[1,"db-neon-text"],[1,"tagline"],["href","https://github.com/sidthesloth92/db-astro-suite/tree/main/tools/file-grouper","target","_blank",1,"launch-btn"],[1,"dossier-grid"],[1,"briefing"],["title","Overview"],["title","Features",1,"specs-card"],[1,"specs-list"],[1,"intelligence"],["title","Setup & Usage"],[1,"protocol-step"],[1,"step-label"],[1,"code-block"],[1,"media-placeholder","screenshot-placeholder"],[1,"placeholder-icon"],[1,"placeholder-text"],[1,"placeholder-subtext"],[1,"dossier-footer"]],template:function(o,b){o&1&&(e(0,"div",0),i(1,"div",1)(2,"div",2)(3,"div",3),e(4,"div",4)(5,"nav",5)(6,"a",6)(7,"span",7),t(8,"←"),n(),t(9," RETURN TO HUB "),n(),e(10,"div",8),t(11,"Module: File Grouper"),n()(),e(12,"header",9)(13,"div")(14,"h1",10),t(15,"FILE GROUPER"),n(),e(16,"p",11),t(17,"DATASET ORGANIZATION UTILITY"),n()(),e(18,"a",12),t(19," ACCESS REPOSITORY "),n()(),e(20,"div",13)(21,"section",14)(22,"dba-ui-card",15)(23,"p"),t(24," File Grouper is a platform-agnostic Go utility designed to solve the chaos of unstructured astrophotography datasets. Specifically optimized for ASIAIR and similar capture systems, it automates the tedious task of sorting thousands of frames into a logical hierarchy. "),n(),e(25,"p"),t(26," A clean dataset is the foundation of high-quality processing. File Grouper ensures your data is ready for calibration and stacking before you even open your processing software. "),n()(),e(27,"dba-ui-card",16)(28,"ul",17)(29,"li")(30,"strong"),t(31,"SENSOR CLASSIFICATION"),n(),e(32,"span"),t(33,"Automatically group and organize images based on the camera model and sensor type detected in metadata."),n()(),e(34,"li")(35,"strong"),t(36,"TEMPORAL SORTING"),n(),e(37,"span"),t(38,"Efficiently group entire imaging sessions by precise dates, keeping multi-night project data separate."),n()(),e(39,"li")(40,"strong"),t(41,"OBJECT TARGETING"),n(),e(42,"span"),t(43,"Classify and folder frames by celestial object names, separating your 'M42' from your 'Rosette' data instantly."),n()()()()(),e(44,"section",18)(45,"dba-ui-card",19)(46,"div",20)(47,"span",21),t(48,"INSTALLATION"),n(),e(49,"pre",22)(50,"code"),t(51,"go install github.com/sidthesloth92/db-astro-suite/tools/file-grouper@latest"),n()()(),e(52,"div",20)(53,"span",21),t(54,"EXECUTION"),n(),e(55,"pre",22)(56,"code"),t(57,"file-grouper --organize-asiair ./raw-data"),n()()(),e(58,"div",23)(59,"div",24),t(60,"terminal"),n(),e(61,"div",25),t(62," CLI EXECUTION DIAGRAM PENDING "),n(),e(63,"div",26),t(64," User to provide terminal output screenshot "),n()()()()(),i(65,"footer",27)(66,"dba-ui-footer"),n()())},dependencies:[p,g,m,f],styles:[`.dossier-container[_ngcontent-%COMP%] {
        position: relative;
        min-height: 100vh;
        background: #05070a;
        color: white;
        font-family: var(--db-font-body, 'Rajdhani', sans-serif);
        padding: 2rem;
      }

      

      .stars-overlay[_ngcontent-%COMP%] {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        z-index: 1;
        background-image:
          radial-gradient(1px 1px at 20px 30px, #eee, rgba(0, 0, 0, 0)),
          radial-gradient(1px 1px at 40px 70px, #fff, rgba(0, 0, 0, 0)),
          radial-gradient(2px 2px at 50px 160px, #ddd, rgba(0, 0, 0, 0));
        background-repeat: repeat;
        background-size: 200px 200px;
        opacity: 0.2;
      }

      .scanlines[_ngcontent-%COMP%] {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        z-index: 100;
        pointer-events: none;
        background:
          linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.1) 50%),
          linear-gradient(
            90deg,
            rgba(255, 0, 0, 0.03),
            rgba(0, 255, 0, 0.01),
            rgba(0, 0, 255, 0.03)
          );
        background-size:
          100% 3px,
          2px 100%;
        opacity: 0.4;
      }

      .content[_ngcontent-%COMP%] {
        position: relative;
        z-index: 2;
        max-width: 1100px;
        margin: 0 auto;
        animation: _ngcontent-%COMP%_dossier-entry 0.8s cubic-bezier(0.23, 1, 0.32, 1);
      }

      @keyframes _ngcontent-%COMP%_dossier-entry {
        0% {
          opacity: 0;
          transform: scale(0.98);
          filter: blur(10px);
        }
        100% {
          opacity: 1;
          transform: scale(1);
          filter: blur(0);
        }
      }

      .top-nav[_ngcontent-%COMP%] {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 3rem;
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        padding-bottom: 1rem;
      }

      .back-link[_ngcontent-%COMP%] {
        color: rgba(255, 255, 255, 0.6);
        text-decoration: none;
        font-family: var(--db-font-mono, monospace);
        font-size: 12px;
        letter-spacing: 0.2em;
        transition: color 0.3s;
      }

      .back-link[_ngcontent-%COMP%]:hover {
        color: var(--db-color-neon-pink);
      }

      .mission-id[_ngcontent-%COMP%] {
        font-family: var(--db-font-mono, monospace);
        font-size: 10px;
        color: var(--db-color-neon-pink);
        opacity: 0.7;
      }

      .dossier-header[_ngcontent-%COMP%] {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 4rem;
        gap: 2rem;
      }

      .dossier-header[_ngcontent-%COMP%]   h1[_ngcontent-%COMP%] {
        font-size: 4rem;
        margin: 0;
        letter-spacing: 0.2em;
        font-weight: 900;
      }

      .tagline[_ngcontent-%COMP%] {
        font-family: var(--db-font-mono, monospace);
        font-size: 14px;
        letter-spacing: 0.5em;
        color: #00f3ff;
        margin-top: 0.5rem;
        text-transform: uppercase;
      }

      .dossier-grid[_ngcontent-%COMP%] {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 2rem;
        margin-bottom: 4rem;
      }

      .briefing[_ngcontent-%COMP%] {
        display: flex;
        flex-direction: column;
        gap: 2rem;
      }

      .briefing[_ngcontent-%COMP%]   p[_ngcontent-%COMP%] {
        color: rgba(255, 255, 255, 0.8);
        line-height: 1.8;
        font-size: 16px;
        margin-bottom: 1.5rem;
      }

      .intelligence[_ngcontent-%COMP%] {
        display: flex;
        flex-direction: column;
        gap: 2rem;
      }

      .specs-list[_ngcontent-%COMP%] {
        list-style: none;
        padding: 0;
        margin: 0;
      }

      .specs-list[_ngcontent-%COMP%]   li[_ngcontent-%COMP%] {
        margin-bottom: 1.5rem;
        border-left: 2px solid var(--db-color-neon-pink);
        padding-left: 1rem;
      }

      .specs-list[_ngcontent-%COMP%]   strong[_ngcontent-%COMP%] {
        display: block;
        color: var(--db-color-neon-pink);
        font-family: var(--db-font-display, sans-serif);
        font-size: 12px;
        letter-spacing: 0.1em;
        margin-bottom: 0.25rem;
      }

      .specs-list[_ngcontent-%COMP%]   span[_ngcontent-%COMP%] {
        font-size: 14px;
        color: rgba(255, 255, 255, 0.6);
      }

      .protocol-step[_ngcontent-%COMP%] {
        margin-bottom: 1.5rem;
      }

      .step-label[_ngcontent-%COMP%] {
        display: block;
        font-family: var(--db-font-mono, monospace);
        font-size: 10px;
        color: rgba(255, 255, 255, 0.4);
        margin-bottom: 0.5rem;
        letter-spacing: 0.1em;
      }

      .code-block[_ngcontent-%COMP%] {
        background: rgba(0, 0, 0, 0.3);
        padding: 1rem;
        border-radius: 4px;
        border-left: 2px solid #00f3ff;
        font-family: var(--db-font-mono, monospace);
        font-size: 12px;
        color: #00f3ff;
        overflow-x: auto;
      }

      .media-placeholder[_ngcontent-%COMP%] {
        background: rgba(255, 255, 255, 0.03);
        border: 1px dashed rgba(255, 255, 255, 0.1);
        border-radius: 8px;
        padding: 3rem;
        text-align: center;
        margin-bottom: 1.5rem;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        margin-top: 1rem;
      }

      .placeholder-icon[_ngcontent-%COMP%] {
        font-size: 2rem;
        color: var(--db-color-neon-pink);
        margin-bottom: 1rem;
        opacity: 0.5;
      }

      .placeholder-text[_ngcontent-%COMP%] {
        font-family: var(--db-font-display, sans-serif);
        font-size: 12px;
        letter-spacing: 0.1em;
        color: white;
        margin-bottom: 0.5rem;
      }

      .placeholder-subtext[_ngcontent-%COMP%] {
        font-size: 11px;
        color: rgba(255, 255, 255, 0.4);
        text-transform: uppercase;
        letter-spacing: 0.05em;
      }

      .dossier-footer[_ngcontent-%COMP%] {
        text-align: center;
      }

      .launch-btn[_ngcontent-%COMP%] {
        display: inline-block;
        padding: 1.25rem 4rem;
        background: transparent;
        border: 1px solid var(--db-color-neon-pink);
        color: var(--db-color-neon-pink);
        font-family: var(--db-font-display, sans-serif);
        font-size: 14px;
        letter-spacing: 0.3em;
        text-decoration: none;
        transition: all 0.3s;
        box-shadow: 0 0 20px rgba(255, 45, 149, 0.1);
      }

      .launch-btn[_ngcontent-%COMP%]:hover {
        background: var(--db-color-neon-pink);
        color: white;
        box-shadow: 0 0 40px rgba(255, 45, 149, 0.4);
        transform: translateY(-2px);
      }

      @media (max-width: 900px) {
        .dossier-grid[_ngcontent-%COMP%] {
          grid-template-columns: 1fr;
        }
        .dossier-header[_ngcontent-%COMP%]   h1[_ngcontent-%COMP%] {
          font-size: 3rem;
        }
      }

      @media (max-width: 600px) {
        .dossier-header[_ngcontent-%COMP%] {
          flex-direction: column;
          align-items: center;
          text-align: center;
        }
        .top-nav[_ngcontent-%COMP%] {
          flex-direction: column;
          gap: 1rem;
          align-items: flex-start;
        }
        .dossier-header[_ngcontent-%COMP%]   h1[_ngcontent-%COMP%] {
          font-size: clamp(2rem, 10vw, 2.5rem);
          letter-spacing: 0.1em;
        }
        .tagline[_ngcontent-%COMP%] {
          letter-spacing: 0.2rem;
          font-size: 12px;
        }
        .launch-btn[_ngcontent-%COMP%] {
          width: 100%;
          text-align: center;
          padding: 1rem 2rem;
          font-size: 12px;
        }
      }`]});let s=r;const x={title:"File Grouper Dossier - Dataset Organization Utility",meta:[{name:"description",content:"A high-performance Go utility for automatically organizing astrophotography datasets by camera, date, and object."},{property:"og:title",content:"File Grouper - Organize Your Space Data"},{property:"og:description",content:"Automate the tedious task of sorting thousands of frames into a logical hierarchy for cleaner processing."},{property:"og:url",content:"https://dbastrosuite.com/dossier/file-grouper"},{name:"twitter:card",content:"summary_large_image"},{name:"twitter:title",content:"File Grouper - Organize Your Space Data"},{name:"twitter:description",content:"A high-performance Go utility for automatically organizing astrophotography datasets by camera, date, and object."}]};export{s as default,x as routeMeta};
