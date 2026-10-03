/*
 * Ruch makiet HubMI – wspólna warstwa GSAP dla wszystkich ekranów.
 *
 * Ekran opisuje ruch atrybutem data-ruch, ten plik go wykonuje:
 *   wejscie  – dzieci kontenera wchodzą po kolei przy otwarciu strony
 *   pokaz    – dzieci kontenera wchodzą po kolei, gdy kontener pojawi się na ekranie
 *   licznik  – liczba odlicza od zera do wartości z treści
 *   slupki   – słupki wykresu rosną od lewej (drugi <span> w .bar)
 *   postep   – pasek postępu wypełnia się od lewej
 *   zakresl  – zakreślacz przeciąga się po <mark> w środku
 *   tok      – moment z /dopasuj: wynik odsłania tok rozumowania krok po kroku
 *   wybor    – zaznaczona opcja (radio) dostaje krótkie potwierdzenie
 *   odswiez  – zmiana filtra odświeża listę wyników (data-ruch-lista = selektor listy)
 *
 * Hover, wciśnięcie i fokus zostają w CSS (proste przejścia stanów).
 * GSAP robi sekwencje: wejścia, odsłony przy przewijaniu, moment /dopasuj.
 * prefers-reduced-motion: reduce → treść od razu widoczna, bez ruchu.
 *
 * W aplikacji: te same sekwencje w komponentach przez useGSAP() z @gsap/react
 * (scope = ref kontenera), czasy i krzywe z tokenów poniżej.
 */
(function () {
  var root = document.documentElement;
  var cichy = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Ukryj elementy wejściowe przed pierwszym malowaniem, żeby nie mrugały.
  // Bezpiecznik: jeśli GSAP się nie wczyta, po 2,5 s treść i tak się pokaże.
  if (!cichy && window.gsap) {
    var styl = document.createElement("style");
    styl.textContent = ".ruch-gotowy [data-ruch~=wejscie]>*{visibility:hidden}";
    document.head.appendChild(styl);
    root.classList.add("ruch-gotowy");
    setTimeout(function () {
      root.classList.remove("ruch-gotowy");
    }, 2500);
  }

  function start() {
    var gsap = window.gsap;
    if (!gsap) return;
    if (window.ScrollTrigger) gsap.registerPlugin(window.ScrollTrigger);

    // Tokeny ruchu (te same co --ruch-* w CSS)
    var T = { szybko: 0.12, zwykle: 0.2, wolno: 0.42, krok: 0.32 };
    gsap.defaults({ duration: T.wolno, ease: "expo.out" });

    var $ = function (sel, el) {
      return Array.prototype.slice.call((el || document).querySelectorAll(sel));
    };
    var dzieci = function (el) {
      return Array.prototype.slice.call(el.children);
    };

    var mm = gsap.matchMedia();

    mm.add("(prefers-reduced-motion: no-preference)", function () {
      // Zakreślacz: tło <mark> rośnie od 0 do 100% szerokości
      function zakresl(marki, opcje) {
        if (!marki.length) return null;
        gsap.set(marki, { backgroundRepeat: "no-repeat" });
        return gsap.fromTo(
          marki,
          { backgroundSize: "0% 100%" },
          Object.assign(
            { backgroundSize: "100% 100%", duration: 0.5, ease: "power3.out", stagger: 0.08 },
            opcje,
          ),
        );
      }

      // 1. Wejście przy otwarciu strony
      $("[data-ruch~=wejscie]").forEach(function (el, i) {
        gsap.from(dzieci(el), {
          autoAlpha: 0,
          y: 14,
          stagger: 0.07,
          delay: 0.05 + i * 0.12,
          clearProps: "transform",
        });
      });

      // 2. Odsłona przy przewijaniu
      $("[data-ruch~=pokaz]").forEach(function (el) {
        gsap.from(dzieci(el), {
          autoAlpha: 0,
          y: 18,
          stagger: 0.06,
          clearProps: "transform",
          scrollTrigger: { trigger: el, start: "top 88%", once: true },
        });
      });

      // 3. Licznik
      $("[data-ruch~=licznik]").forEach(function (el) {
        var cel = parseInt(el.textContent, 10);
        if (isNaN(cel)) return;
        el.setAttribute("aria-label", String(cel));
        var stan = { n: 0 };
        gsap.to(stan, {
          n: cel,
          duration: 1.1,
          ease: "power2.out",
          snap: { n: 1 },
          onUpdate: function () {
            el.textContent = stan.n;
          },
          scrollTrigger: { trigger: el, start: "top 92%", once: true },
        });
      });

      // 4. Słupki wykresu
      $("[data-ruch~=slupki]").forEach(function (el) {
        gsap.from($(".bar > span:nth-child(2)", el), {
          scaleX: 0,
          transformOrigin: "left center",
          duration: 0.7,
          ease: "power3.out",
          stagger: 0.06,
          scrollTrigger: { trigger: el, start: "top 85%", once: true },
        });
      });

      // 5. Pasek postępu
      $("[data-ruch~=postep]").forEach(function (el) {
        gsap.from(el.firstElementChild, {
          scaleX: 0,
          transformOrigin: "left center",
          duration: 0.8,
          delay: 0.3,
          ease: "power3.out",
        });
      });

      // 6. Zakreślacz poza momentem /dopasuj
      $("[data-ruch~=zakresl]").forEach(function (el) {
        zakresl($("mark", el), { delay: 0.5, stagger: 0.12 });
      });

      // 7. Moment /dopasuj: tok rozumowania jako jedna oś czasu, odtwarzana ponownie po „Dopasuj”
      $("[data-ruch~=tok]").forEach(function (el) {
        var kroki = $(".step", el);
        if (!kroki.length) return;
        var tl = gsap.timeline({ defaults: { duration: T.wolno, ease: "expo.out" } });

        // Linia między kropkami to ::before – sterujemy nią przez zmienną CSS --linia
        gsap.set(kroki, { "--linia": 0 });

        kroki.forEach(function (krok, i) {
          var etykieta = "krok" + (i + 1);
          tl.addLabel(etykieta, i === 0 ? 0 : "-=0.1");
          tl.from(krok, { autoAlpha: 0, y: 10 }, etykieta);
          tl.from($(".dot", krok), { scale: 0.4, duration: 0.5, ease: "back.out(2)" }, etykieta);

          var karty = $("article", krok);
          if (karty.length) {
            tl.from(karty, { autoAlpha: 0, y: 12, stagger: 0.08 }, etykieta + "+=0.15");
            var m = zakresl($("article mark", krok), { stagger: 0.08 });
            if (m) tl.add(m, ">-0.1");
          } else {
            var mk = zakresl($("mark", krok));
            if (mk) tl.add(mk, etykieta + "+=0.15");
          }
          if (i < kroki.length - 1) {
            tl.to(krok, { "--linia": 1, duration: 0.36, ease: "power2.inOut" }, ">-0.1");
          }
        });

        // Ponowne dopasowanie: przycisk „Dopasuj” i przykłady odtwarzają wynik od nowa
        var wyzwalacze = $(el.getAttribute("data-ruch-wyzwalacz") || "");
        wyzwalacze.forEach(function (b) {
          b.addEventListener("click", function () {
            tl.restart();
          });
        });
      });

      // 8. Potwierdzenie wyboru opcji (delegacja – działa też po ponownym renderze)
      $("[data-ruch~=wybor]").forEach(function (el) {
        el.addEventListener("change", function (e) {
          var opcja = e.target.closest("label");
          if (!opcja) return;
          gsap.fromTo(
            opcja,
            { scale: 0.97 },
            {
              scale: 1,
              duration: 0.5,
              ease: "back.out(3)",
              overwrite: "auto",
              clearProps: "transform",
            },
          );
        });
      });

      // 9. Odświeżenie wyników po zmianie filtra
      $("[data-ruch~=odswiez]").forEach(function (el) {
        var sel = el.getAttribute("data-ruch-lista");
        el.addEventListener("change", function () {
          gsap.fromTo(
            $(sel),
            { autoAlpha: 0.25, y: 8 },
            {
              autoAlpha: 1,
              y: 0,
              duration: 0.35,
              stagger: 0.04,
              overwrite: true,
              clearProps: "transform",
            },
          );
        });
      });

      return function () {
        root.classList.remove("ruch-gotowy");
      };
    });

    root.classList.remove("ruch-gotowy");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();
