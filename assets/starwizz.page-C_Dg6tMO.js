import{i as c,D as d,ɵ as l,R as g,a as n,d as a,b as t,c as e}from"./index-D-j5sRSr.js";import{C as p,F as m,a as f}from"./warp-speed-loader.component-iVldfliQ.js";const r=class r{constructor(){const i=c(d);let o=i.querySelector('link[rel="canonical"]');o||(o=i.createElement("link"),o.setAttribute("rel","canonical"),i.head.appendChild(o)),o.setAttribute("href","https://dbastrosuite.com/dossier/starwizz")}};r.ɵfac=function(o){return new(o||r)},r.ɵcmp=l({type:r,selectors:[["dba-hub-starwizz-dossier"]],decls:91,vars:0,consts:[[1,"dossier-container"],[1,"stars-overlay"],[1,"nebula-overlay"],[1,"scanlines"],[1,"content"],[1,"top-nav"],["routerLink","/",1,"back-link"],[1,"arrow"],[1,"mission-id"],[1,"dossier-header"],[1,"header-logo-container"],["src","assets/img/sw.png","alt","Starwizz Logo",1,"dossier-logo"],[1,"db-neon-text"],[1,"tagline"],["href","/starwizz/","target","_self",1,"launch-btn"],[1,"overview-section"],["title","Overview"],[1,"subsection-title"],[1,"features-section"],["title","Features"],[1,"features-grid"],[1,"feature-item"],[1,"feature-icon"],[1,"bottom-grid"],[1,"how-it-works-section"],["title","How It Works"],[1,"steps-list"],[1,"demo-section"],["title","Demo"],[1,"demo-image-container"],["src","assets/img/sw_demo.gif","alt","Starwizz Demo",1,"demo-image"],[1,"dossier-footer"]],template:function(o,b){o&1&&(n(0,"div",0),a(1,"div",1)(2,"div",2)(3,"div",3),n(4,"div",4)(5,"nav",5)(6,"a",6)(7,"span",7),t(8,"←"),e(),t(9," RETURN TO HUB "),e(),n(10,"div",8),t(11,"Module: StarWizz"),e()(),n(12,"header",9)(13,"div",10),a(14,"img",11),n(15,"div")(16,"h1",12),t(17,"STARWIZZ"),e(),n(18,"p",13),t(19,"CINEMATIC STARFIELD GENERATOR"),e()()(),n(20,"a",14),t(21," Launch Tool "),e()(),n(22,"section",15)(23,"dba-ui-card",16)(24,"p"),t(25," Starwizz is a browser-based 4K starfield and galaxy animation generator. Set your parameters, hit record, and download a cinematic space background in minutes — no software to install, no account required. "),e(),n(26,"h4",17),t(27,"The Problem It Solves"),e(),n(28,"p"),t(29," Creating a cinematic space background used to require 3D software, stock footage subscriptions, or a graphics team. For astrophotographers, content creators, and educators working alone, none of those options are quick or free. Starwizz removes every barrier — no installation, no subscription, no render queue. "),e(),n(30,"p"),t(31," Open it in a browser, dial in your simulation parameters, and record a perfectly looped 4K starfield video in minutes. The output is professional-grade and suited for YouTube intros, Instagram Reels, presentation backdrops, and virtual meeting backgrounds. "),e()()(),n(32,"section",18)(33,"dba-ui-card",19)(34,"div",20)(35,"div",21)(36,"div",22),t(37,"⭐"),e(),n(38,"strong"),t(39,"POPULATION CONTROL"),e(),n(40,"span"),t(41,"Modify the density and number of stars to simulate different galactic sectors."),e()(),n(42,"div",21)(43,"div",22),t(44,"🚀"),e(),n(45,"strong"),t(46,"VELOCITY VECTORS"),e(),n(47,"span"),t(48,"Adjust travel speed to transition from a slow gentle drift to full high-warp effects."),e()(),n(49,"div",21)(50,"div",22),t(51,"🌀"),e(),n(52,"strong"),t(53,"ROTATIONAL DYNAMICS"),e(),n(54,"span"),t(55,"Fine-tune camera rotation to create chaotic orbits or smooth stable traversals."),e()()()()(),n(56,"div",23)(57,"section",24)(58,"dba-ui-card",25)(59,"ol",26)(60,"li")(61,"strong"),t(62,"CHOOSE A SCENE TYPE"),e(),n(63,"span"),t(64,"Select a pure deep-space starfield or a galaxy background with dynamic nebula cloud overlays."),e()(),n(65,"li")(66,"strong"),t(67,"SET YOUR PARAMETERS"),e(),n(68,"span"),t(69,"Use the real-time HUD to adjust star density, travel velocity, rotation speed, zoom factor, and shooting star frequency."),e()(),n(70,"li")(71,"strong"),t(72,"PREVIEW LIVE"),e(),n(73,"span"),t(74,"The Canvas-based renderer updates immediately — what you see in the browser is exactly what will be recorded."),e()(),n(75,"li")(76,"strong"),t(77,"RECORD AT 4K"),e(),n(78,"span"),t(79,"Hit Record and Starwizz captures the animation at full 4K resolution directly in the browser using the MediaRecorder API — no plugins required."),e()(),n(80,"li")(81,"strong"),t(82,"DOWNLOAD AND USE"),e(),n(83,"span"),t(84,"Save the video file and drop it straight into your video editor, presentation software, or upload it directly to social media."),e()()()()(),n(85,"section",27)(86,"dba-ui-card",28)(87,"div",29),a(88,"img",30),e()()()(),a(89,"footer",31)(90,"dba-ui-footer"),e()())},dependencies:[g,p,m,f],styles:[`.dossier-container[_ngcontent-%COMP%] {
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

      .header-logo-container[_ngcontent-%COMP%] {
        display: flex;
        align-items: center;
        gap: 2rem;
      }

      .dossier-logo[_ngcontent-%COMP%] {
        width: 5rem;
        height: 5rem;
        object-fit: contain;
      }

      .dossier-header[_ngcontent-%COMP%]   h1[_ngcontent-%COMP%] {
        font-size: 4rem;
        margin: 0;
        letter-spacing: 0.2em;
        font-weight: 900;
        color: var(--db-color-neon-pink);
      }

        dba-ui-card .card__title {
        color: var(--db-color-neon-pink);
        text-shadow: 0 0 8px rgba(255, 45, 149, 0.35);
      }

      [_nghost-%COMP%] {
        --card-title-color: var(--db-color-neon-pink);
      }

      .tagline[_ngcontent-%COMP%] {
        font-family: var(--db-font-mono, monospace);
        font-size: 14px;
        letter-spacing: 0.5em;
        color: #00f3ff;
        margin-top: 0.5rem;
        text-transform: uppercase;
      }

      .overview-section[_ngcontent-%COMP%] {
        margin-bottom: 2rem;
      }

      .overview-section[_ngcontent-%COMP%]   p[_ngcontent-%COMP%] {
        color: rgba(255, 255, 255, 0.8);
        line-height: 1.8;
        font-size: 16px;
        margin-bottom: 1.5rem;
      }

      .features-section[_ngcontent-%COMP%] {
        margin-bottom: 2rem;
      }

      .features-grid[_ngcontent-%COMP%] {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 1.5rem;
      }

      .feature-item[_ngcontent-%COMP%] {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        padding: 1.25rem;
        border: 1px solid rgba(255, 255, 255, 0.07);
        border-radius: 8px;
        background: rgba(255, 255, 255, 0.02);
        transition: border-color 0.3s;
      }

      .feature-item[_ngcontent-%COMP%]:hover {
        border-color: rgba(255, 45, 149, 0.4);
      }

      .feature-icon[_ngcontent-%COMP%] {
        font-size: 1.75rem;
        line-height: 1;
        margin-bottom: 0.25rem;
      }

      .feature-item[_ngcontent-%COMP%]   strong[_ngcontent-%COMP%] {
        display: block;
        color: var(--db-color-neon-pink);
        font-family: var(--db-font-display, sans-serif);
        font-size: 11px;
        letter-spacing: 0.1em;
      }

      .feature-item[_ngcontent-%COMP%]   span[_ngcontent-%COMP%] {
        font-size: 13px;
        color: rgba(255, 255, 255, 0.6);
        line-height: 1.6;
      }

      .bottom-grid[_ngcontent-%COMP%] {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 2rem;
        margin-bottom: 4rem;
      }

      .how-it-works-section[_ngcontent-%COMP%], 
   .demo-section[_ngcontent-%COMP%] {
        display: flex;
        flex-direction: column;
      }

      .subsection-title[_ngcontent-%COMP%] {
        font-family: var(--db-font-display, sans-serif);
        font-size: 12px;
        letter-spacing: 0.15em;
        color: var(--db-color-neon-pink);
        text-transform: uppercase;
        margin: 1.5rem 0 0.75rem;
        padding-bottom: 0.4rem;
        border-bottom: 1px solid rgba(255, 45, 149, 0.3);
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

      .steps-list[_ngcontent-%COMP%] {
        list-style: none;
        padding: 0;
        margin: 0;
        counter-reset: steps;
      }

      .steps-list[_ngcontent-%COMP%]   li[_ngcontent-%COMP%] {
        margin-bottom: 1.5rem;
        border-left: 2px solid #00f3ff;
        padding-left: 1rem;
        counter-increment: steps;
      }

      .steps-list[_ngcontent-%COMP%]   strong[_ngcontent-%COMP%] {
        display: block;
        color: #00f3ff;
        font-family: var(--db-font-display, sans-serif);
        font-size: 12px;
        letter-spacing: 0.1em;
        margin-bottom: 0.25rem;
      }

      .steps-list[_ngcontent-%COMP%]   span[_ngcontent-%COMP%] {
        font-size: 14px;
        color: rgba(255, 255, 255, 0.6);
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
      }

      .placeholder-icon[_ngcontent-%COMP%] {
        font-size: 2rem;
        color: var(--db-color-neon-pink);
        margin-bottom: 1rem;
        opacity: 0.5;
      }

      .demo-image-container[_ngcontent-%COMP%] {
        width: 100%;
        border-radius: 8px;
        overflow: hidden;
        border: 1px solid rgba(255, 45, 149, 0.2);
        box-shadow: 0 0 30px rgba(0, 0, 0, 0.5);
      }

      .demo-image[_ngcontent-%COMP%] {
        width: 100%;
        height: auto;
        display: block;
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
        .bottom-grid[_ngcontent-%COMP%] {
          grid-template-columns: 1fr;
        }
        .features-grid[_ngcontent-%COMP%] {
          grid-template-columns: repeat(2, 1fr);
        }
        .dossier-header[_ngcontent-%COMP%]   h1[_ngcontent-%COMP%] {
          font-size: 3rem;
        }
      }

      @media (max-width: 600px) {
        .features-grid[_ngcontent-%COMP%] {
          grid-template-columns: 1fr;
        }
        .dossier-header[_ngcontent-%COMP%] {
          flex-direction: column;
          align-items: center;
          text-align: center;
        }
        .header-logo-container[_ngcontent-%COMP%] {
          flex-direction: column;
          text-align: center;
          gap: 1rem;
        }
        .dossier-header[_ngcontent-%COMP%]   h1[_ngcontent-%COMP%] {
          font-size: clamp(2rem, 10vw, 2.5rem);
          letter-spacing: 0.1em;
        }
        .tagline[_ngcontent-%COMP%] {
          letter-spacing: 0.2rem;
          font-size: 12px;
        }
        .top-nav[_ngcontent-%COMP%] {
          flex-direction: column;
          gap: 1rem;
          align-items: flex-start;
        }
        .launch-btn[_ngcontent-%COMP%] {
          width: 100%;
          text-align: center;
          padding: 1rem 2rem;
          font-size: 12px;
        }
      }`]});let s=r;const x={title:"Starwizz - Cinematic Starfield Generator",meta:[{name:"description",content:"Starwizz is a high-fidelity browser-based tool for creating immersive 4K starfield animations and cinematic space backgrounds — no install required."},{property:"og:title",content:"Starwizz - Cinematic Starfield Generator"},{property:"og:description",content:"Starwizz is a high-fidelity browser-based tool for creating immersive 4K starfield animations and cinematic space backgrounds — no install required."},{property:"og:image",content:"https://dbastrosuite.com/starwizz/assets/img/preview.png"},{property:"og:url",content:"https://dbastrosuite.com/dossier/starwizz"},{name:"twitter:card",content:"summary_large_image"},{name:"twitter:title",content:"Starwizz - Cinematic Starfield Generator"},{name:"twitter:description",content:"Starwizz is a high-fidelity browser-based tool for creating immersive 4K starfield animations and cinematic space backgrounds — no install required."},{name:"twitter:image",content:"https://dbastrosuite.com/starwizz/assets/img/preview.png"}]};export{s as default,x as routeMeta};
