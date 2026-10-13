import { Link } from "react-router-dom";
import { ArrowRight, Coins, Gamepad2, Heart, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import loveableIcon from "@/assets/loveable-connect-icon.webp";

const features = [
  {
    icon: Heart,
    title: "Profili, like e match",
    description: "Crea il tuo profilo, esplora la bacheca e scopri persone con cui condividere interessi e nuove conoscenze.",
  },
  {
    icon: MessageCircle,
    title: "Conversazioni e connessioni",
    description: "Conosci le persone attraverso la chat. Crediti e abbonamenti permettono di accedere alle funzionalità indicate nei singoli piani.",
  },
  {
    icon: Gamepad2,
    title: "Sfide e classifiche",
    description: "Partecipa ai minigiochi Tris, Othello e Dama, con punteggi ELO, classifiche e tornei tra utenti.",
  },
];

const PublicHome = () => (
  <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-indigo-50 text-foreground dark:from-gray-900 dark:via-purple-950 dark:to-gray-900">
    <header className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-5 sm:px-6">
      <Link to="/" className="flex items-center gap-2 font-semibold" aria-label="LoveableConnect, pagina iniziale">
        <img src={loveableIcon} alt="" className="h-11 w-11 object-contain" />
        <span>LoveableConnect</span>
      </Link>
      <nav aria-label="Navigazione pubblica" className="flex items-center gap-4 text-sm">
        <Link to="/credits" className="hover:underline">Prezzi</Link>
        <Button asChild variant="outline"><Link to="/auth">Accedi</Link></Button>
      </nav>
    </header>

    <main className="mx-auto max-w-6xl space-y-12 px-4 pb-12 pt-10 sm:px-6 sm:pt-16">
      <section className="mx-auto max-w-3xl text-center" aria-labelledby="public-home-title">
        <p className="mb-4 text-sm font-semibold uppercase tracking-widest text-primary">Incontri e socializzazione · 18+</p>
        <h1 id="public-home-title" className="text-4xl font-bold tracking-tight sm:text-5xl">Trova ciò che cerchi.</h1>
        <p className="mt-6 text-lg leading-relaxed text-muted-foreground">
          LoveableConnect è una piattaforma online per persone maggiorenni che vogliono
          conoscersi, chattare e divertirsi insieme. Profili, like, match e minigiochi
          ti aiutano a vivere nuove connessioni.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button asChild size="lg"><Link to="/auth">Accedi o registrati <ArrowRight aria-hidden="true" /></Link></Button>
          <Button asChild variant="outline" size="lg"><Link to="/credits">Scopri crediti e abbonamenti</Link></Button>
        </div>
        <p className="mt-4 text-sm text-muted-foreground">La registrazione è gratuita. Le funzionalità a pagamento sono facoltative.</p>
      </section>

      <section aria-labelledby="features-title">
        <h2 id="features-title" className="mb-5 text-2xl font-semibold">Come funziona</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {features.map(({ icon: Icon, title, description }) => (
            <Card key={title} className="bg-card/80">
              <CardHeader>
                <Icon className="mb-2 h-6 w-6 text-primary" aria-hidden="true" />
                <CardTitle className="text-lg">{title}</CardTitle>
              </CardHeader>
              <CardContent className="text-sm leading-relaxed text-muted-foreground">{description}</CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section aria-labelledby="plans-title" className="rounded-xl border bg-card/80 p-6 sm:p-8">
        <div className="flex items-center gap-3">
          <Coins className="h-6 w-6 shrink-0 text-primary" aria-hidden="true" />
          <h2 id="plans-title" className="text-2xl font-semibold">Crediti e abbonamenti</h2>
        </div>
        <div className="mt-4 grid gap-4 text-sm leading-relaxed text-muted-foreground md:grid-cols-2">
          <p>
            Puoi acquistare pacchetti di crediti virtuali per le funzionalità interne
            del sito oppure scegliere un abbonamento Settimanale, Platino o Premium.
            La pagina Prezzi mostra importi in euro, quantità e benefici dei piani,
            insieme alle condizioni dell'offerta per la prima settimana.
          </p>
          <p>
            I pacchetti di crediti sono acquisti singoli. Gli abbonamenti prevedono
            il rinnovo automatico, disattivabile secondo le condizioni del servizio.
            I crediti sono utilizzabili all'interno di LoveableConnect e non sono
            convertibili in denaro.
          </p>
        </div>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button asChild><Link to="/credits">Consulta prezzi e benefici <ArrowRight aria-hidden="true" /></Link></Button>
          <Button asChild variant="outline"><Link to="/terms?tab=terms">Condizioni, rinnovi e rimborsi</Link></Button>
        </div>
      </section>

      <section aria-labelledby="contact-title" className="text-sm leading-relaxed text-muted-foreground">
        <h2 id="contact-title" className="mb-2 text-lg font-semibold text-foreground">Assistenza e informazioni</h2>
        <p>Per domande sul servizio, sugli acquisti o sul tuo abbonamento, scrivi a <a href="mailto:loveableconnect@hotmail.com" className="text-primary hover:underline">loveableconnect@hotmail.com</a>.</p>
        <p className="mt-2">Il servizio è riservato ai maggiorenni. La registrazione è necessaria per usare profili, match e chat.</p>
      </section>
    </main>

    <footer className="border-t bg-card/50">
      <div className="mx-auto flex max-w-6xl flex-wrap justify-between gap-4 px-4 py-6 text-sm text-muted-foreground sm:px-6">
        <span>LoveableConnect</span>
        <nav aria-label="Informazioni legali" className="flex flex-wrap gap-4">
          <Link to="/terms?tab=terms" className="hover:underline">Termini e condizioni</Link>
          <Link to="/terms?tab=privacy" className="hover:underline">Privacy</Link>
          <Link to="/terms?tab=cookies" className="hover:underline">Cookie</Link>
        </nav>
      </div>
    </footer>
  </div>
);

export default PublicHome;
