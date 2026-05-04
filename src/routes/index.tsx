import { Title } from "solid-start";
import { createSignal, onMount } from "solid-js";

export default function Home() {
  const [isVisible, setIsVisible] = createSignal(false);
  const [lang, setLang] = createSignal<'nl' | 'en'>('en');

  onMount(() => {
    // Small delay to trigger entry animations
    setTimeout(() => setIsVisible(true), 100);
  });

  const content = {
    en: {
      aiTitle: "AI Development & Intermediary",
      aiDesc: "As an advanced Research & Development firm, we act as your intermediary for cutting-edge Artificial Intelligence. We specialize in the latest techniques, including Large Language Models (LLMs), Retrieval-Augmented Generation (RAG), Autonomous Agentic Workflows, Computer Vision, SFT/RLHF Fine-Tuning, and Multi-Agent Systems.",
      consultingTitle: "Digital Business Consulting",
      consultingDesc: "We provide strategic guidance to optimize your digital infrastructure. Our expertise covers comprehensive ERP and CRM integrations, alongside advanced data analysis to drive actionable business intelligence.",
      historyTitle: "Our History",
      historyDesc: "Our journey began in 2000 as Sitesource, a passionate one-man firm dedicated to robust front-end and back-end development. Evolving with the digital landscape, we transformed into Strategea COMMV in 2023. During the 2019 - 2026 period, a leading role as CEO for Didakta BV was also fulfilled. In April 2026, we proudly became part of DIEP Management (diep.one), bridging the gap between Tech and Talent.",
      contact: "Get in touch"
    },
    nl: {
      aiTitle: "AI Ontwikkeling & Intermediair",
      aiDesc: "Als vooruitstrevend Research & Development bureau fungeren wij als uw intermediair voor geavanceerde Artificial Intelligence. Wij integreren de allernieuwste technieken, waaronder Large Language Models (LLMs), Retrieval-Augmented Generation (RAG), Autonome Agent Workflows, Computer Vision, SFT/RLHF Fine-Tuning en Multi-Agent Systemen.",
      consultingTitle: "Strategisch Digitaal Advies",
      consultingDesc: "Wij bieden strategisch advies om uw digitale infrastructuur te optimaliseren. Onze expertise omvat naadloze ERP- en CRM-integraties en diepgaande data-analyse om meetbare bedrijfswaarde te creëren.",
      historyTitle: "Onze Historiek",
      historyDesc: "Ons verhaal startte in 2000 als Sitesource, een eenmanszaak gespecialiseerd in front-end en back-end development. In 2023 zijn we geëvolueerd naar Strategea COMMV. In de periode 2023 - 2026 werd tevens een leidende rol als CEO voor Didakta BV vervuld. Sinds april 2026 maken we met trots deel uit van DIEP Management (diep.one), waar we tech en talent met elkaar verbinden.",
      contact: "Neem contact op"
    }
  };

  return (
    <main class={`app-container ${isVisible() ? 'is-visible' : ''}`}>
      <Title>Strategea | AI & Digital Consulting</Title>

      <div class="lang-toggle">
        <button class={lang() === 'en' ? 'active' : ''} onClick={() => setLang('en')}>EN</button>
        <button class={lang() === 'nl' ? 'active' : ''} onClick={() => setLang('nl')}>NL</button>
      </div>

      <div class="content-wrapper">
        <div class="logo-container">
          <img src="strategea.svg" alt="Strategea Logo" class="logo" />
        </div>

        <div class="services-grid">
          <div class="service-card">
            <div class="icon-wrapper">
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" /><path d="M5 3v4" /><path d="M19 17v4" /><path d="M3 5h4" /><path d="M17 19h4" /></svg>
            </div>
            <h2>{content[lang()].aiTitle}</h2>
            <p>{content[lang()].aiDesc}</p>
          </div>

          <div class="service-card">
            <div class="icon-wrapper">
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.21 15.89A10 10 0 1 1 8 2.83" /><path d="M22 12A10 10 0 0 0 12 2v10z" /></svg>
            </div>
            <h2>{content[lang()].consultingTitle}</h2>
            <p>{content[lang()].consultingDesc}</p>
          </div>
        </div>

        <div class="history-section">
          <h2>{content[lang()].historyTitle}</h2>
          <p innerHTML={content[lang()].historyDesc.replace('(diep.one)', '(<a href="https://diep.one" target="_blank" rel="noopener noreferrer">diep.one</a>)')}></p>
        </div>

        <div class="action-container">
          <a href="mailto:info@strategea.be" class="contact-btn">
            <span>{content[lang()].contact}</span>
          </a>
        </div>

        <footer class="app-footer">
          <p>Strategea COMMV &bull; BTW / VAT: BE1002562801</p>
        </footer>
      </div>
    </main>
  );
}
