import{C as f,F as h,a as x,B as _}from"./warp-speed-loader.component-iVldfliQ.js";import{ɵ as O,R as y,a as n,d as i,c as t,b as e,e as d,f as o,g as a,h as l}from"./index-D-j5sRSr.js";const p=()=>["/dossier/starwizz"],g=()=>["/dossier/astrogram"],r=class r{};r.ɵfac=function(s){return new(s||r)},r.ɵcmp=O({type:r,selectors:[["dba-hub-home-page"]],decls:51,vars:12,consts:[[1,"hub-container"],[1,"stars-overlay"],[1,"nebula-overlay"],[1,"black-hole-bg"],[3,"fill"],[1,"bg-scrim"],[1,"scanlines"],[1,"content"],[1,"hero"],[1,"system-status"],[1,"status-indicator","animate-pulse"],[1,"hero__title","db-neon-text"],[1,"hero__subtitle"],["id","suite-description",1,"hero__description"],["aria-labelledby","tools-title",1,"tools"],["id","tools-title",1,"sr-only"],[1,"tools__grid"],[1,"mission-card",3,"routerLink"],["title","STARWIZZ","subtitle","Starfield Generator","logoSrc","assets/img/sw.png",3,"clickable"],[1,"mission-status"],["aria-label","Learn more about Starwizz",1,"launch-cta",3,"click","routerLink"],[1,"launch-text"],[1,"launch-arrow"],["title","ASTROGRAM","subtitle","Professional Exposure Cards. Instantly.","logoSrc","assets/img/astrogram.png",3,"clickable"],["aria-label","Learn more about Astrogram",1,"launch-cta",3,"click","routerLink"],[1,"mission-card","mission-card--disabled"],["title","FILE GROUPER","subtitle","CLI Utility",3,"clickable"],[1,"mission-status","mission-status--progress"]],template:function(s,C){s&1&&(n(0,"div",0),i(1,"div",1)(2,"div",2),n(3,"div",3),i(4,"dba-ui-black-hole-loader",4),t(),i(5,"div",5)(6,"div",6),n(7,"main",7)(8,"header",8)(9,"div",9),i(10,"span",10),e(11," DB Astro Suite Core // Online "),t(),n(12,"h1",11),e(13,"DB ASTRO SUITE"),t(),n(14,"p",12),e(15," A COLLECTION OF ASTRO TOOLS TO GO FROM SENSOR TO SOCIAL "),t(),n(16,"div",13),e(17," A professional collection of social-media focused astrophotography tools built to get your space photos off your hard drive and onto social media as cool, shareable videos and posts. Seamlessly transform your captures into cinematic starfield animations with Starwizz or professional Instagram exposure cards with Astrogram. Spend less time processing data and more time capturing the cosmos. "),t()(),n(18,"section",14)(19,"h2",15),e(20,"Available Astro Tools"),t(),n(21,"div",16)(22,"div",17)(23,"dba-ui-card",18)(24,"div",19),e(25,"READY"),t(),n(26,"p"),e(27," Generate high-fidelity starfield videos with surgical control over star count, velocity, and rotation parameters. "),t(),n(28,"a",20),d("click",function(c){return c.stopPropagation()}),n(29,"span",21),e(30,"LEARN MORE"),t(),n(31,"span",22),e(32,"→"),t()()()(),n(33,"div",17)(34,"dba-ui-card",23)(35,"div",19),e(36,"READY"),t(),n(37,"p"),e(38," Astrogram generates beautifully designed and professional-grade Instagram-ready images that display your full astrophotography exposure details, from target and integration time to equipment, filters, and Bortle scale. All in one clean, shareable image. "),t(),n(39,"a",24),d("click",function(c){return c.stopPropagation()}),n(40,"span",21),e(41,"LEARN MORE"),t(),n(42,"span",22),e(43,"→"),t()()()(),n(44,"div",25)(45,"dba-ui-card",26)(46,"div",27),e(47," IN PROGRESS "),t(),n(48,"p"),e(49," A high-performance Go script to automatically group and organize ASIAIR image datasets by camera, date, and object. "),t()()()()(),i(50,"dba-ui-footer"),t()()),s&2&&(o(4),a("fill",!0),o(18),a("routerLink",l(8,p)),o(),a("clickable",!0),o(5),a("routerLink",l(9,p)),o(5),a("routerLink",l(10,g)),o(),a("clickable",!0),o(5),a("routerLink",l(11,g)),o(6),a("clickable",!1))},dependencies:[y,f,h,x,_],styles:[`[_nghost-%COMP%] {
        display: block;
        margin: 0;
        padding: 0;
        overflow-x: hidden;
      }

      .hub-container[_ngcontent-%COMP%] {
        position: relative;
        min-height: 100vh;
        background: #05070a;
        color: white;
        font-family: var(--db-font-body, 'Rajdhani', sans-serif);
        display: flex;
        flex-direction: column;
        align-items: center;
        padding: 4rem 2rem;
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
          radial-gradient(2px 2px at 50px 160px, #ddd, rgba(0, 0, 0, 0)),
          radial-gradient(2px 2px at 90px 40px, #fff, rgba(0, 0, 0, 0)),
          radial-gradient(1px 1px at 130px 80px, #fff, rgba(0, 0, 0, 0)),
          radial-gradient(2px 2px at 160px 120px, #ddd, rgba(0, 0, 0, 0));
        background-repeat: repeat;
        background-size: 200px 200px;
        opacity: 0.3;
        animation: _ngcontent-%COMP%_stars-twinkle 4s infinite alternate;
      }

      @keyframes _ngcontent-%COMP%_stars-twinkle {
        0% {
          opacity: 0.2;
        }
        100% {
          opacity: 0.5;
        }
      }

      .nebula-overlay[_ngcontent-%COMP%] {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        z-index: 1;
        background:
          radial-gradient(
            circle at 20% 30%,
            rgba(255, 45, 149, 0.05) 0%,
            transparent 40%
          ),
          radial-gradient(
            circle at 80% 70%,
            rgba(0, 243, 255, 0.05) 0%,
            transparent 40%
          );
        pointer-events: none;
      }

      .black-hole-bg[_ngcontent-%COMP%] {
        position: fixed;
        inset: 0;
        z-index: 1;
        pointer-events: none;
        opacity: 0.8;
      }

      .bg-scrim[_ngcontent-%COMP%] {
        position: fixed;
        inset: 0;
        z-index: 2;
        background: rgba(5, 7, 10, 0.25);
        pointer-events: none;
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
        max-width: 1200px;
        width: 100%;
        animation: _ngcontent-%COMP%_content-entry 1s cubic-bezier(0.23, 1, 0.32, 1);
      }

      @keyframes _ngcontent-%COMP%_content-entry {
        0% {
          opacity: 0;
          transform: translateY(20px);
          filter: blur(10px);
        }
        100% {
          opacity: 1;
          transform: translateY(0);
          filter: blur(0);
        }
      }

      

      .hero[_ngcontent-%COMP%] {
        text-align: center;
        margin-bottom: 5rem;
        max-width: 800px;
        margin-left: auto;
        margin-right: auto;
      }

      .system-status[_ngcontent-%COMP%] {
        display: inline-flex;
        align-items: center;
        gap: 0.75rem;
        font-family: var(--db-font-mono, 'Fira Code', monospace);
        font-size: 10px;
        letter-spacing: 0.2em;
        color: var(--db-color-neon-pink);
        background: rgba(255, 45, 149, 0.1);
        padding: 0.5rem 1rem;
        border-radius: 4px;
        margin-bottom: 1.5rem;
        border-left: 2px solid var(--db-color-neon-pink);
      }

      .status-indicator[_ngcontent-%COMP%] {
        width: 6px;
        height: 6px;
        background: var(--db-color-neon-pink);
        border-radius: 50%;
        box-shadow: 0 0 10px var(--db-color-neon-pink);
      }

      .hero__title[_ngcontent-%COMP%] {
        font-size: clamp(
          2rem,
          6vw,
          40px
        ); 

        margin-bottom: 0.5rem;
        letter-spacing: 0.1em;
        font-weight: 900;
      }

      .hero__subtitle[_ngcontent-%COMP%] {
        color: rgba(255, 255, 255, 0.5);
        font-family: var(--db-font-mono, 'Fira Code', monospace);
        font-size: 11px;
        letter-spacing: 0.4em;
        text-transform: uppercase;
        margin-bottom: 1.5rem;
      }

      .hero__description[_ngcontent-%COMP%] {
        color: rgba(255, 255, 255, 0.7);
        font-size: 15px;
        line-height: 1.6;
        font-weight: 400;
        letter-spacing: 0.02em;
        border-top: 1px solid rgba(255, 255, 255, 0.1);
        padding-top: 1.5rem;
      }

      

      .tools[_ngcontent-%COMP%] {
        margin-bottom: 4rem;
      }

      .tools__grid[_ngcontent-%COMP%] {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
        gap: 2rem;
      }

      .mission-card[_ngcontent-%COMP%] {
        text-decoration: none;
        color: inherit;
        display: block;
        transition: all 0.3s cubic-bezier(0.23, 1, 0.32, 1);
        position: relative;
      }

      .mission-card[_ngcontent-%COMP%]   dba-ui-card[_ngcontent-%COMP%] {
        height: 100%;
      }

      .mission-status[_ngcontent-%COMP%] {
        position: absolute;
        top: 1.5rem;
        right: 1.5rem;
        font-family: var(--db-font-mono, 'Fira Code', monospace);
        font-size: 9px;
        padding: 0.25rem 0.5rem;
        border: 1px solid rgba(0, 243, 255, 0.3);
        color: #00f3ff;
        background: rgba(0, 243, 255, 0.05);
        letter-spacing: 0.1em;
      }

      .mission-status--local[_ngcontent-%COMP%] {
        border-color: rgba(255, 255, 255, 0.2);
        color: rgba(255, 255, 255, 0.6);
        background: transparent;
      }

      .mission-status--progress[_ngcontent-%COMP%] {
        border-color: rgba(255, 191, 0, 0.4);
        color: #ffbf00;
        background: rgba(255, 191, 0, 0.05);
      }

      .mission-card--disabled[_ngcontent-%COMP%] {
        opacity: 0.6;
        filter: grayscale(0.2);
        cursor: default;
      }

      .mission-card[_ngcontent-%COMP%]   p[_ngcontent-%COMP%] {
        color: rgba(255, 255, 255, 0.6);
        line-height: 1.6;
        font-size: 14px;
        margin-bottom: 2rem;
        height: 4.5rem; 

        overflow: hidden;
        display: -webkit-box;
        -webkit-line-clamp: 3;
        -webkit-box-orient: vertical;
      }

      .launch-cta[_ngcontent-%COMP%] {
        position: relative;
        display: flex;
        align-items: center;
        justify-content: space-between;
        border: 1px solid rgba(255, 45, 149, 0.3);
        padding: 0.75rem 1.25rem;
        color: var(--db-color-neon-pink);
        font-family: var(--db-font-display, 'Orbitron', sans-serif);
        font-size: 10px;
        letter-spacing: 0.2em;
        transition: all 0.4s cubic-bezier(0.23, 1, 0.32, 1);
        overflow: hidden;
        text-decoration: none;
        z-index: 10;
      }

      .launch-cta[_ngcontent-%COMP%]::before {
        content: '';
        position: absolute;
        top: 0;
        left: -100%;
        width: 100%;
        height: 100%;
        background: linear-gradient(
          90deg,
          transparent,
          rgba(255, 45, 149, 0.2),
          transparent
        );
        transition: all 0.5s ease;
      }

      .launch-text[_ngcontent-%COMP%], 
   .launch-arrow[_ngcontent-%COMP%] {
        position: relative;
        z-index: 2;
        transition: all 0.3s ease;
      }

      .launch-arrow[_ngcontent-%COMP%] {
        transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
      }

      

      .launch-cta[_ngcontent-%COMP%]:hover {
        border-color: var(--db-color-neon-pink);
        background: rgba(255, 45, 149, 0.1);
        box-shadow: 0 0 15px rgba(255, 45, 149, 0.2);
        transform: scale(1.02);
      }

      .launch-cta[_ngcontent-%COMP%]:hover::before {
        left: 100%;
      }

      .launch-cta[_ngcontent-%COMP%]:hover   .launch-text[_ngcontent-%COMP%] {
        color: white;
        text-shadow: 0 0 8px var(--db-color-neon-pink);
      }

      .launch-cta[_ngcontent-%COMP%]:hover   .launch-arrow[_ngcontent-%COMP%] {
        transform: translateX(6px) scale(1.2);
        color: white;
      }

      .mission-card[_ngcontent-%COMP%]:hover {
        transform: translateY(-8px);
      }

      @media (max-width: 768px) {
        .hub-container[_ngcontent-%COMP%] {
          padding: 2rem 1rem;
        }
        .hero__title[_ngcontent-%COMP%] {
          font-size: 2rem;
        }
        .tools__grid[_ngcontent-%COMP%] {
          grid-template-columns: 1fr;
        }
      }

      .sr-only[_ngcontent-%COMP%] {
        position: absolute;
        width: 1px;
        height: 1px;
        padding: 0;
        margin: -1px;
        overflow: hidden;
        clip: rect(0, 0, 0, 0);
        white-space: nowrap;
        border-width: 0;
      }`]});let m=r;const P={title:"DB Astro Suite - Professional Astrophotography Tools",meta:[{name:"description",content:"A professional collection of social-media focused astrophotography tools. Transform captures into cinematic starfield animations or professional Instagram exposure cards."},{property:"og:title",content:"DB Astro Suite - From Sensor to Social"},{property:"og:description",content:"A professional collection of social-media focused astrophotography tools built to get your space photos off your hard drive and onto social media"}]};export{m as default,P as routeMeta};
