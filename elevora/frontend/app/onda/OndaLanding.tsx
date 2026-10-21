"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";
import { OndaMarkup } from "./OndaMarkup";
import "./onda.css";

type Cleanup = () => void;

function required<T extends Element>(root: HTMLElement, selector: string): T {
  const found = root.querySelector<T>(selector);
  if (!found) throw new Error(`Onda landing is missing ${selector}`);
  return found;
}

function layoutBox(element: HTMLElement) {
  let x = 0;
  let y = 0;
  let node: HTMLElement | null = element;
  while (node) {
    x += node.offsetLeft;
    y += node.offsetTop;
    node = node.offsetParent as HTMLElement | null;
  }
  return {
    x,
    y,
    w: element.offsetWidth,
    h: element.offsetHeight,
    cx: x + element.offsetWidth / 2,
    cy: y + element.offsetHeight / 2,
  };
}

function splitWords(element: HTMLElement): Cleanup {
  const original = element.innerHTML;
  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
  const nodes: Text[] = [];
  while (walker.nextNode()) nodes.push(walker.currentNode as Text);
  nodes.forEach((node) => {
    const fragment = document.createDocumentFragment();
    node.textContent?.split(/(\s+)/).forEach((part) => {
      if (!part) return;
      if (/^\s+$/.test(part)) {
        fragment.append(part);
        return;
      }
      const word = document.createElement("span");
      word.className = "ink__word";
      word.textContent = part;
      fragment.append(word);
    });
    node.replaceWith(fragment);
  });
  return () => {
    element.innerHTML = original;
  };
}

/**
 * Native React host for the Onda 8B motion source. Timeline values, triggers,
 * easing, pinning and ordering mirror the source document; only querying is
 * scoped to this landing root so the application routes remain independent.
 */
export function OndaLanding() {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    gsap.registerPlugin(ScrollTrigger);
    ScrollTrigger.config({ ignoreMobileResize: true });

    const nav = required<HTMLElement>(root, "#navigation");
    const menuToggle = required<HTMLButtonElement>(root, ".nav__menu");
    const menu = required<HTMLElement>(root, ".menu");
    const menuClose = required<HTMLButtonElement>(root, ".menu__close");
    const hero = required<HTMLElement>(root, "#hero");
    const footer = required<HTMLElement>(root, "#footer");
    const observerCleanups: Cleanup[] = [];
    const eventCleanups: Cleanup[] = [];
    const originalHtmlClass = document.documentElement.className;
    let lenis: Lenis | null = null;
    let ticker: ((time: number) => void) | null = null;

    const setMenuOpen = (open: boolean) => {
      menu.hidden = !open;
      menuToggle.setAttribute("aria-expanded", String(open));
      if (open) {
        lenis?.stop();
        menuClose.focus();
      } else {
        lenis?.start();
        menuToggle.focus();
      }
    };
    const openMenu = () => setMenuOpen(true);
    const closeMenu = () => setMenuOpen(false);
    const trapMenu = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
      if (event.key !== "Tab") return;
      const items = [...menu.querySelectorAll<HTMLElement>("a, button")];
      const first = items[0];
      const last = items[items.length - 1];
      if (!first || !last) return;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    menuToggle.addEventListener("click", openMenu);
    menuClose.addEventListener("click", closeMenu);
    menu.addEventListener("keydown", trapMenu);
    menu.querySelectorAll("a").forEach((link) => link.addEventListener("click", closeMenu));
    eventCleanups.push(() => {
      menuToggle.removeEventListener("click", openMenu);
      menuClose.removeEventListener("click", closeMenu);
      menu.removeEventListener("keydown", trapMenu);
      menu.querySelectorAll("a").forEach((link) => link.removeEventListener("click", closeMenu));
    });

    if ("IntersectionObserver" in window) {
      const heroObserver = new IntersectionObserver(([entry]) => {
        hero.classList.toggle("is-offscreen", !entry.isIntersecting);
      });
      heroObserver.observe(hero);
      const footerObserver = new IntersectionObserver(([entry]) => {
        footer.classList.toggle("is-offscreen", !entry.isIntersecting);
      });
      footerObserver.observe(footer);
      observerCleanups.push(() => heroObserver.disconnect(), () => footerObserver.disconnect());
    }

    // Original scroll engine: exact source options and ticker wiring.
    const motionQuery = gsap.matchMedia();
    motionQuery.add("(prefers-reduced-motion: no-preference)", () => {
      root.classList.add("lenis");
      lenis = new Lenis({ lerp: 0.09, anchors: { offset: -nav.offsetHeight } });
      ticker = (time) => lenis?.raf(time * 1000);
      lenis.on("scroll", ScrollTrigger.update);
      gsap.ticker.add(ticker);
      gsap.ticker.lagSmoothing(0);
      return () => {
        if (ticker) gsap.ticker.remove(ticker);
        gsap.ticker.lagSmoothing(500, 33);
        lenis?.destroy();
        lenis = null;
        ticker = null;
        root.classList.remove("lenis", "lenis-smooth", "lenis-stopped");
      };
    });

    const context = gsap.context(() => {
      const adjacent = (a: string, b: string) => {
        const order = [...root.querySelectorAll<HTMLElement>("[data-8b-section]")]
          .filter((section) => section.getAttribute("data-8b-section") !== "navigation")
          .map((section) => section.id);
        return order.indexOf(a) >= 0 && order[order.indexOf(a) + 1] === b;
      };

      const effects = {
        rise(element: HTMLElement, vars = {}) {
          const dot = element.querySelector<HTMLElement>(".m-dot");
          const timeline = gsap.timeline(vars);
          timeline.fromTo(
            element,
            { yPercent: 38, clipPath: "inset(0% -6% 100% -6%)" },
            { yPercent: 0, clipPath: "inset(-30% -6% -30% -6%)", duration: 0.95, ease: "expo.out", clearProps: "clipPath,transform" },
            0
          );
          if (dot) {
            timeline.fromTo(dot, { scale: 0, yPercent: -260 }, { scale: 1, yPercent: 0, duration: 0.75, ease: "back.out(2.2)", clearProps: "transform" }, 0.42);
          }
          return timeline;
        },
        ink(element: HTMLElement, vars = {}) {
          const words = element.querySelectorAll(".ink__word");
          return gsap.timeline(vars).fromTo(words, { opacity: 0.16 }, { opacity: 1, duration: 0.3, stagger: 0.06, ease: "none" });
        },
        iris(element: HTMLElement, vars = {}) {
          const image = element.querySelector("img");
          const timeline = gsap.timeline(vars);
          timeline.fromTo(element, { clipPath: "circle(0% at 50% 50%)" }, { clipPath: "circle(75% at 50% 50%)", duration: 1.15, ease: "expo.inOut", clearProps: "clipPath" }, 0);
          if (image) timeline.fromTo(image, { scale: 1.2 }, { scale: 1, duration: 1.5, ease: "expo.out", clearProps: "transform" }, 0.15);
          return timeline;
        },
      };

      // Shared data-8b motion effects from original source.
      root.querySelectorAll<HTMLElement>("[data-8b-section]").forEach((section) => {
        const bound = (name: string) => [...section.querySelectorAll<HTMLElement>(`[data-8b-motion~="${name}"]`)];
        const rises = bound("rise");
        const inks = bound("ink");
        const irises = bound("iris");
        const match = gsap.matchMedia();
        match.add("(prefers-reduced-motion: no-preference)", () => {
          rises.forEach((element, index) => ScrollTrigger.create({ id: `effect:rise:${section.id}:${index}`, trigger: element, start: "top 88%", once: true, animation: effects.rise(element, { paused: true }) }));
          const reverts = inks.map(splitWords);
          inks.forEach((element, index) => ScrollTrigger.create({ id: `effect:ink:${section.id}:${index}`, trigger: element, start: "top 88%", end: "bottom 68%", scrub: 0.4, animation: effects.ink(element) }));
          irises.forEach((element, index) => ScrollTrigger.create({ id: `effect:iris:${section.id}:${index}`, trigger: element, start: "top 86%", once: true, animation: effects.iris(element, { paused: true }) }));
          return () => reverts.forEach((revert) => revert());
        });
      });

      const sourceMotion = gsap.matchMedia();
      sourceMotion.add("(prefers-reduced-motion: no-preference)", () => {
        // scene:hero ---------------------------------------------------------
        if (adjacent("hero", "statement")) {
          const statement = required<HTMLElement>(root, "#statement");
          const target = required<HTMLElement>(statement, ".statement__dot");
          const aperture = required<HTMLElement>(hero, ".hero__aperture");
          const geometry = () => {
            const from = layoutBox(aperture);
            const to = layoutBox(target);
            return { x: to.cx - from.cx, y: to.cy - from.cy, scale: to.w / from.w };
          };
          gsap.timeline({ defaults: { ease: "none" }, scrollTrigger: { id: "hero:exit", trigger: hero, start: "bottom bottom", end: "bottom 30%", scrub: true, invalidateOnRefresh: true } })
            .to(aperture, { x: () => geometry().x, y: () => geometry().y, ease: "power1.inOut", duration: 1 }, 0)
            .to(aperture, { scale: () => geometry().scale, ease: "power3.in", duration: 1 }, 0)
            .to(required<HTMLElement>(hero, ".hero__tint"), { opacity: 1, ease: "power2.in", duration: 0.6 }, 0.4)
            .to(required<HTMLElement>(hero, ".hero__orbit"), { opacity: 0, duration: 0.3 }, 0)
            .to(required<HTMLElement>(hero, ".hero__word"), { xPercent: () => (matchMedia("(min-width: 900px) and (orientation: landscape)").matches ? -14 : 0), ease: "power1.in", duration: 1 }, 0)
            .to(required<HTMLElement>(hero, ".hero__intro"), { y: -70, ease: "power1.in", duration: 1 }, 0);

          // scene:statement entry is intentionally tied to the hero handoff.
          const lines = statement.querySelectorAll(".statement__line");
          gsap.timeline({ defaults: { ease: "none" }, scrollTrigger: { id: "statement:entry", trigger: statement, start: "top bottom", end: "top 30%", scrub: true } })
            .fromTo(lines, { yPercent: 85, xPercent: (index: number) => (index ? 9 : -6) }, { yPercent: 0, xPercent: 0, duration: 0.8, stagger: 0.12, ease: "power2.out" }, 0)
            .fromTo(target, { scale: 0 }, { scale: 1, duration: 0.1 }, 0.9);
        }
        const statement = required<HTMLElement>(root, "#statement");
        gsap.from(statement.querySelectorAll(".statement__index li"), { yPercent: 70, opacity: 0, duration: 0.8, stagger: 0.07, ease: "expo.out", scrollTrigger: { id: "statement:index", trigger: required(statement, ".statement__index"), start: "top 85%", once: true } });

        // scene:work ---------------------------------------------------------
        const work = required<HTMLElement>(root, "#work");
        const track = required<HTMLElement>(work, ".work__track");
        const frame = required<HTMLElement>(work, ".work__window");
        const workStage = required<HTMLElement>(work, ".work__stage");
        work.classList.add("is-track");
        const run = () => Math.max(0, track.offsetWidth - (work.clientWidth - 2 * parseFloat(getComputedStyle(workStage).paddingLeft)));
        const setRun = () => work.style.setProperty("--run", `${Math.round(run())}px`);
        setRun();
        ScrollTrigger.addEventListener("refreshInit", setRun);
        gsap.fromTo(required(work, ".work__plate"), { clipPath: "inset(0% 3.2% 0% 3.2% round 44px)" }, { clipPath: "inset(0% 0% 0% 0% round 0px)", ease: "power1.out", scrollTrigger: { id: "work:plate", trigger: work, start: "top bottom", end: "top 15%", scrub: true } });
        const workTimeline = gsap.timeline({ defaults: { ease: "none" }, scrollTrigger: { id: "work", trigger: work, start: "top top", end: "bottom bottom", scrub: true, invalidateOnRefresh: true } });
        workTimeline.to(track, { x: () => -run() }, 0);
        work.querySelectorAll(".case__img").forEach((image) => workTimeline.fromTo(image, { xPercent: -5 }, { xPercent: 5 }, 0));
        if (adjacent("work", "again")) {
          const cases = [...track.querySelectorAll<HTMLElement>(".case")];
          const radius = () => (innerWidth < 700 ? innerWidth * 2.1 : innerWidth * 0.95);
          const bend = (card: HTMLElement) => {
            const offset = layoutBox(frame).x + card.offsetLeft + card.offsetWidth / 2 - run() - innerWidth / 2;
            const angle = offset / radius();
            return { x: radius() * Math.sin(angle) - offset, y: radius() * (1 - Math.cos(angle)), rotation: angle * 180 / Math.PI };
          };
          const exit = gsap.timeline({ defaults: { ease: "power1.in" }, scrollTrigger: { id: "work:exit", trigger: work, start: "bottom bottom", end: "bottom 30%", scrub: true, invalidateOnRefresh: true } });
          exit.to(frame, { x: () => -innerWidth * 0.2, duration: 1 }, 0);
          cases.forEach((card) => exit.to(card, { x: () => bend(card).x, y: () => bend(card).y, rotation: () => bend(card).rotation, duration: 1 }, 0));
        }

        // scene:again --------------------------------------------------------
        const again = required<HTMLElement>(root, "#again");
        const againStage = required<HTMLElement>(again, ".again__stage");
        const againHead = required<HTMLElement>(again, ".again__head");
        const swing = required<HTMLElement>(again, ".again__swing");
        const wheel = required<HTMLElement>(again, ".again__wheel");
        const cards = [...wheel.querySelectorAll<HTMLElement>(".partner")];
        again.classList.add("is-wheel");
        cards.forEach((card, index) => card.style.setProperty("--i", String(index)));
        let step = 0;
        let arcTop = 0;
        let wheelRadius = 1;
        const measure = () => {
          const width = innerWidth;
          const height = againStage.offsetHeight;
          const headBottom = againHead.offsetTop + againHead.offsetHeight;
          const room = height - headBottom - innerHeight * 0.04;
          const card = Math.max(180, Math.min(width * (width < 700 ? 0.7 : 0.28), (room - 32) / 1.25));
          arcTop = headBottom + Math.max(28, (room - card * 1.25) * 0.4);
          wheelRadius = Math.max(width * 0.95, card * 3.3);
          step = 2 * Math.asin((card + Math.max(18, width * 0.024)) / (2 * wheelRadius)) * 180 / Math.PI;
          again.style.setProperty("--card", `${card.toFixed(1)}px`);
          again.style.setProperty("--radius", `${wheelRadius.toFixed(1)}px`);
          again.style.setProperty("--step", `${step.toFixed(3)}deg`);
          again.style.setProperty("--arc-top", `${arcTop.toFixed(1)}px`);
          again.style.setProperty("--spin", `${Math.round(cards.length * innerHeight * 0.42)}px`);
        };
        measure();
        ScrollTrigger.addEventListener("refreshInit", measure);
        gsap.fromTo(wheel, { rotation: () => step * 0.55 }, { rotation: () => -(cards.length - 0.45) * step, ease: "none", scrollTrigger: { id: "again", trigger: again, start: "top 30%", end: "bottom bottom", scrub: true, invalidateOnRefresh: true } });
        if (adjacent("work", "again")) {
          gsap.timeline({ defaults: { ease: "none" }, scrollTrigger: { id: "again:entry", trigger: again, start: "top bottom", end: "top 30%", scrub: true, invalidateOnRefresh: true } })
            .fromTo(swing, { rotation: () => Math.max(4, Math.asin(Math.min(1, innerWidth * 0.3 / wheelRadius)) * 180 / Math.PI - step * 0.55) }, { rotation: 0, ease: "power1.out" }, 0)
            .fromTo(swing, { y: () => -(arcTop - 40) }, { y: 0, ease: "power2.in" }, 0)
            .fromTo(againHead, { yPercent: 45 }, { yPercent: 0, ease: "power2.out" }, 0);
        }

        // scene:capabilities -------------------------------------------------
        const capabilities = required<HTMLElement>(root, "#capabilities");
        const services = [...capabilities.querySelectorAll<HTMLElement>(".service")];
        capabilities.classList.add("is-deck");
        services.forEach((card, index) => card.style.setProperty("--i", String(index)));
        services.forEach((card, index) => {
          const next = services[index + 1];
          if (!next) return;
          gsap.timeline({ defaults: { ease: "none" }, scrollTrigger: { id: `capabilities:${index}`, trigger: next, start: "top bottom", end: () => `top ${parseFloat(getComputedStyle(next).top) || 0}px`, scrub: true, invalidateOnRefresh: true } })
            .to(card, { scale: 0.9 }, 0)
            .to(required(card, ".service__shade"), { opacity: 0.55 }, 0);
        });

        // scene:method -------------------------------------------------------
        const method = required<HTMLElement>(root, "#method");
        const steps = [...method.querySelectorAll<HTMLElement>(".step")];
        const stations = [...method.querySelectorAll<HTMLElement>(".method__station")];
        method.classList.add("is-cycle");
        const methodTimeline = gsap.timeline({ defaults: { ease: "none" }, scrollTrigger: { id: "method", trigger: required(method, ".method__steps"), start: "top 62%", end: "bottom 62%", scrub: true } });
        methodTimeline
          .fromTo(required(method, ".method__arc"), { attr: { "stroke-dashoffset": 1 } }, { attr: { "stroke-dashoffset": 0 }, duration: 1 }, 0)
          .fromTo(required(method, ".method__arm"), { rotation: 0 }, { rotation: 360, duration: 1 }, 0);
        steps.forEach((stepElement, index) => {
          const at = index / steps.length;
          methodTimeline.fromTo(stepElement, { opacity: 0.2 }, { opacity: 1, duration: 0.07 }, Math.max(0, at - 0.03));
          if (stations[index]) {
            methodTimeline
              .fromTo(stations[index], { scale: 0.4 }, { scale: 1.35, duration: 0.05, ease: "back.out(3)" }, at)
              .to(stations[index], { scale: 1, duration: 0.08 }, at + 0.06);
          }
        });

        // scene:studio -------------------------------------------------------
        const collage = required<HTMLElement>(root, "#studio .studio__collage");
        const shots = [...collage.querySelectorAll<HTMLElement>(".shot")];
        const tilt = [-8, 6, -4, 9, -6];
        const offset = (shot: HTMLElement, axis: "x" | "y") => {
          const centre = axis === "x" ? collage.offsetWidth / 2 : Math.min(collage.offsetHeight / 2, innerHeight * 0.45);
          const own = axis === "x" ? shot.offsetLeft + shot.offsetWidth / 2 : shot.offsetTop + shot.offsetHeight / 2;
          return centre - own;
        };
        const studioTimeline = gsap.timeline({ defaults: { ease: "power2.out" }, scrollTrigger: { id: "studio", trigger: collage, start: "top 82%", end: () => (innerWidth < 900 ? "top 10%" : "center 55%"), scrub: true, invalidateOnRefresh: true } });
        shots.forEach((shot, index) => studioTimeline.fromTo(shot, { x: () => offset(shot, "x"), y: () => offset(shot, "y"), rotation: tilt[index % tilt.length], scale: 0.66 }, { x: 0, y: 0, rotation: 0, scale: 1, duration: 1 }, (shots.length - 1 - index) * 0.08));

        // scene:journal ------------------------------------------------------
        const journal = required<HTMLElement>(root, "#journal");
        const journalShots = [...journal.querySelectorAll<HTMLElement>(".journal__shot")];
        const stories = [...journal.querySelectorAll<HTMLElement>(".story")];
        journal.classList.add("is-swap");
        stories.forEach((story, index) => {
          const timeline = gsap.timeline({ defaults: { ease: "none" }, scrollTrigger: { id: `journal:${index}`, trigger: story, start: "top 84%", end: "top 50%", scrub: true } });
          timeline.fromTo(story, { opacity: 0.25 }, { opacity: 1, duration: 0.8 }, 0);
          if (index && journalShots[index]) timeline.fromTo(journalShots[index], { clipPath: "circle(0% at 50% 50%)" }, { clipPath: "circle(75% at 50% 50%)", ease: "power1.inOut", duration: 1 }, 0);
        });

        // scene:contact ------------------------------------------------------
        const contact = required<HTMLElement>(root, "#contact");
        const voice = required<HTMLElement>(contact, ".contact__voice");
        gsap.timeline({ defaults: { ease: "none" }, scrollTrigger: { id: "contact", trigger: contact, start: "top bottom", end: "top 15%", scrub: true } })
          .fromTo(voice, { fontWeight: 400, scale: 0.82, transformOrigin: "0% 100%" }, { fontWeight: 800, scale: 1, duration: 1 }, 0)
          .fromTo(required(contact, ".contact__title .m-dot"), { scale: 0, yPercent: -400 }, { scale: 1, yPercent: 0, duration: 0.25, ease: "power2.in" }, 0.75);

        // scene:footer -------------------------------------------------------
        const footerAperture = required<HTMLElement>(footer, ".footer__aperture");
        const dot = () => required<HTMLElement>(footer, ".footer__period").offsetWidth / footerAperture.offsetWidth;
        gsap.timeline({ defaults: { ease: "none" }, scrollTrigger: { id: "footer", trigger: required(footer, ".footer__bye"), start: "bottom bottom", end: "bottom 55%", scrub: true, invalidateOnRefresh: true } })
          .fromTo(footerAperture, { scale: dot }, { scale: 1, ease: "power2.inOut", duration: 1 }, 0)
          .fromTo(required(footer, ".footer__tint"), { opacity: 1 }, { opacity: 0, duration: 0.5 }, 0.45)
          .fromTo(required(footer, ".footer__word"), { yPercent: 30 }, { yPercent: 0, ease: "power2.out", duration: 0.8 }, 0);

        return () => {
          ScrollTrigger.removeEventListener("refreshInit", setRun);
          ScrollTrigger.removeEventListener("refreshInit", measure);
          work.classList.remove("is-track");
          work.style.removeProperty("--run");
          again.classList.remove("is-wheel");
          ["--card", "--radius", "--step", "--arc-top", "--spin"].forEach((name) => again.style.removeProperty(name));
          cards.forEach((card) => card.style.removeProperty("--i"));
          capabilities.classList.remove("is-deck");
          services.forEach((service) => service.style.removeProperty("--i"));
          method.classList.remove("is-cycle");
          journal.classList.remove("is-swap");
        };
      });
      return () => sourceMotion.revert();
    }, root);

    const refresh = () => {
      ScrollTrigger.sort();
      ScrollTrigger.refresh();
    };
    const onLoad = () => document.fonts?.ready.then(refresh).catch(refresh);
    if (document.readyState === "complete") onLoad();
    else window.addEventListener("load", onLoad, { once: true });

    return () => {
      window.removeEventListener("load", onLoad);
      observerCleanups.forEach((cleanup) => cleanup());
      eventCleanups.forEach((cleanup) => cleanup());
      context.revert();
      motionQuery.revert();
      ScrollTrigger.getAll().forEach((trigger) => {
        if (trigger.vars.trigger instanceof Element && root.contains(trigger.vars.trigger)) trigger.kill();
      });
      root.classList.remove("lenis", "lenis-smooth", "lenis-stopped");
      document.documentElement.className = originalHtmlClass;
    };
  }, []);

  return (
    <div ref={rootRef} className="onda-landing m-text">
      <OndaMarkup />
    </div>
  );
}
