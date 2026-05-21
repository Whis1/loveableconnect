import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft } from "lucide-react";
import { useLanguageDetection } from "@/hooks/useLanguageDetection";

// Costanti centralizzate: se cambia il titolare, l'email o l'indirizzo,
// basta aggiornare qui.
const TITOLARE_NOME = "Giuseppe Chighini";
const TITOLARE_LUOGO = "Sassari (SS), Italia";
const TITOLARE_EMAIL = "loveableconnect@hotmail.com";
const NOME_SITO = "LoveableConnect";
const URL_SITO = "https://loveableconnect.vercel.app";
const DATA_AGGIORNAMENTO = "21 maggio 2026";

const TermsAndConditions = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  useLanguageDetection();

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50 dark:from-gray-900 dark:to-gray-800 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <Button
          variant="ghost"
          onClick={() => {
            if (window.history.state && (window.history.state.idx ?? 0) > 0) {
              navigate(-1);
            } else {
              navigate("/");
            }
          }}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          {t("terms.back")}
        </Button>

        <Card>
          <CardHeader>
            <CardTitle className="text-2xl md:text-3xl text-center">
              {t("terms.title")}
            </CardTitle>
            <p className="text-center text-xs text-muted-foreground mt-2">
              Ultimo aggiornamento: {DATA_AGGIORNAMENTO}
            </p>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="privacy" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="privacy">{t("terms.privacy")}</TabsTrigger>
                <TabsTrigger value="terms">{t("terms.termsAndConditions")}</TabsTrigger>
                <TabsTrigger value="cookies">{t("terms.cookies")}</TabsTrigger>
              </TabsList>

              {/* ============================================================ */}
              {/* PRIVACY POLICY                                                */}
              {/* ============================================================ */}
              <TabsContent
                value="privacy"
                className="space-y-6 mt-6 text-sm max-h-[600px] overflow-y-auto pr-2"
              >
                <div className="space-y-4">
                  <h2 className="text-2xl font-bold">Informativa sulla Privacy</h2>
                  <p className="text-muted-foreground">
                    La presente informativa è resa ai sensi del Regolamento (UE) 2016/679
                    (&laquo;GDPR&raquo;) e del D.lgs. 196/2003 (&laquo;Codice Privacy&raquo;).
                  </p>

                  <div className="space-y-3">
                    <h3 className="text-lg font-semibold">1. Titolare del trattamento</h3>
                    <p>
                      Il Titolare del trattamento dei dati personali è {TITOLARE_NOME},
                      con sede in {TITOLARE_LUOGO}, contattabile all'indirizzo e-mail{" "}
                      <a
                        href={`mailto:${TITOLARE_EMAIL}`}
                        className="text-primary hover:underline"
                      >
                        {TITOLARE_EMAIL}
                      </a>
                      .
                    </p>
                    <p className="text-muted-foreground italic">
                      Il servizio {NOME_SITO} è attualmente gestito da una persona fisica
                      in attesa di costituzione della relativa società. Tale informazione
                      verrà aggiornata non appena la società sarà operativa.
                    </p>
                  </div>

                  <div className="space-y-3">
                    <h3 className="text-lg font-semibold">2. Tipologie di dati raccolti</h3>
                    <p>Nell'utilizzo del servizio possono essere raccolti i seguenti dati:</p>
                    <ul className="list-disc list-inside space-y-2 pl-4">
                      <li>
                        <strong>Dati di registrazione:</strong> indirizzo e-mail, password
                        (memorizzata in forma cifrata), nickname, nome scelto, data di
                        nascita, genere, città.
                      </li>
                      <li>
                        <strong>Orientamento sessuale (categoria particolare di dati ex
                        art. 9 GDPR):</strong> l'utente può indicare facoltativamente il
                        proprio orientamento sessuale e le proprie preferenze. Tale
                        informazione costituisce categoria particolare di dati personali
                        e viene trattata <strong>esclusivamente sulla base del consenso
                        esplicito</strong> dell'utente, prestato al momento
                        dell'inserimento. L'utente può in qualsiasi momento revocare il
                        consenso o rimuovere il dato dal proprio profilo, senza che ciò
                        pregiudichi la liceità del trattamento effettuato in precedenza.
                      </li>
                      <li>
                        <strong>Dati di geolocalizzazione:</strong> qualora l'utente
                        conceda l'autorizzazione tramite il proprio browser e prosegua
                        con il consenso richiesto sul Sito, {NOME_SITO} utilizza la
                        posizione del dispositivo per mostrare profili geograficamente
                        vicini e calcolare la distanza tra utenti. La posizione non viene
                        utilizzata per finalità diverse, non è condivisa con terzi a
                        scopi pubblicitari e può essere revocata in qualsiasi momento
                        dalle impostazioni del browser o del Sito.
                      </li>
                      <li>
                        <strong>Dati di profilo:</strong> immagini caricate, biografia,
                        interessi, brani musicali preferiti (selezionati tramite Spotify),
                        preferenze relative alle persone con cui si desidera entrare in
                        contatto.
                      </li>
                      <li>
                        <strong>Dati di utilizzo:</strong> messaggi inviati e ricevuti
                        (testo, voce), &laquo;like&raquo;, match, partite ai minigame,
                        punteggio ELO, crediti accumulati o spesi, abbonamenti attivi.
                      </li>
                      <li>
                        <strong>Dati di pagamento:</strong> i pagamenti vengono gestiti
                        esclusivamente tramite Stripe. {NOME_SITO} non memorizza i dati
                        della carta di credito né altri estremi di pagamento; riceve
                        unicamente la conferma dell'avvenuta transazione.
                      </li>
                      <li>
                        <strong>Dati tecnici:</strong> indirizzo IP, tipo di browser,
                        sistema operativo, token di autenticazione, eventuali identificativi
                        per le notifiche push.
                      </li>
                    </ul>
                  </div>

                  <div className="space-y-3">
                    <h3 className="text-lg font-semibold">3. Finalità del trattamento</h3>
                    <p>I dati vengono trattati per le seguenti finalità:</p>
                    <ul className="list-disc list-inside space-y-2 pl-4">
                      <li>creare e gestire l'account dell'utente;</li>
                      <li>
                        permettere l'interazione con altri utenti (messaggi, like, match,
                        minigame);
                      </li>
                      <li>gestire l'acquisto e l'utilizzo di crediti e abbonamenti;</li>
                      <li>
                        garantire la sicurezza del servizio, prevenire frodi e abusi e dare
                        seguito a segnalazioni;
                      </li>
                      <li>adempiere agli obblighi di legge (fiscali, contabili);</li>
                      <li>
                        rispondere alle richieste di supporto e migliorare il funzionamento
                        del servizio.
                      </li>
                    </ul>
                  </div>

                  <div className="space-y-3">
                    <h3 className="text-lg font-semibold">4. Base giuridica</h3>
                    <p>Il trattamento si fonda su:</p>
                    <ul className="list-disc list-inside space-y-2 pl-4">
                      <li>
                        l'esecuzione del contratto stipulato tra l'utente e il Titolare al
                        momento della registrazione (art. 6, par. 1, lett. b GDPR);
                      </li>
                      <li>
                        il consenso dell'utente per le funzionalità che lo richiedono, ad
                        esempio l'invio di messaggi vocali o le notifiche push (art. 6, par.
                        1, lett. a GDPR);
                      </li>
                      <li>
                        l'adempimento di obblighi di legge cui è soggetto il Titolare (art.
                        6, par. 1, lett. c GDPR);
                      </li>
                      <li>
                        il legittimo interesse del Titolare a prevenire frodi e a tutelare
                        la sicurezza della piattaforma (art. 6, par. 1, lett. f GDPR).
                      </li>
                    </ul>
                    <p className="font-semibold mt-3">Profilazione e matching automatizzato</p>
                    <p>
                      Per offrire suggerimenti di profili e calcolare l'ordine di
                      visualizzazione, {NOME_SITO} utilizza una logica algoritmica
                      automatizzata che tiene conto di parametri quali la distanza
                      geografica, le preferenze indicate, l'attività sulla piattaforma e
                      l'eventuale punteggio dei minigame. Tale trattamento configura una
                      forma di profilazione ai sensi dell'art. 22 GDPR, ma{" "}
                      <strong>non produce effetti giuridici né incide in modo
                      significativo sulla persona</strong>: le scelte di interazione
                      restano sempre dell'utente. L'utente ha comunque diritto di
                      richiedere informazioni sulla logica utilizzata e di esprimere il
                      proprio punto di vista contattando il Titolare.
                    </p>
                  </div>

                  <div className="space-y-3">
                    <h3 className="text-lg font-semibold">5. Servizi di terze parti</h3>
                    <p>
                      Per il funzionamento del servizio, {NOME_SITO} si avvale dei seguenti
                      fornitori, che agiscono in qualità di Responsabili del trattamento ex
                      art. 28 GDPR:
                    </p>
                    <ul className="list-disc list-inside space-y-2 pl-4">
                      <li>
                        <strong>Supabase</strong> — hosting del database, autenticazione,
                        memorizzazione delle immagini di profilo e dei messaggi.
                      </li>
                      <li>
                        <strong>Vercel</strong> — hosting e distribuzione del sito.
                      </li>
                      <li>
                        <strong>Stripe</strong> — elaborazione dei pagamenti per crediti e
                        abbonamenti.
                      </li>
                      <li>
                        <strong>Spotify</strong> — selezione e anteprima dei brani
                        musicali preferiti pubblicati sul profilo. I dati vengono trattati
                        secondo l'informativa di Spotify.
                      </li>
                    </ul>
                    <p>
                      Alcuni di questi fornitori possono trattare dati anche al di fuori
                      dell'Unione Europea (in particolare negli Stati Uniti). In tali casi
                      il trasferimento avviene sulla base delle decisioni di adeguatezza
                      della Commissione Europea o delle Clausole Contrattuali Standard
                      previste dal GDPR.
                    </p>
                    <p className="font-semibold mt-3">Banner promozionali interni</p>
                    <p>
                      Agli utenti senza abbonamento Premium {NOME_SITO} può mostrare, ad
                      intervalli, banner promozionali relativi <strong>esclusivamente ai
                      propri prodotti e servizi</strong> (acquisto di crediti o
                      attivazione dell'abbonamento). Tali banner sono caricati dal
                      Titolare e <strong>non costituiscono pubblicità di terze parti</strong>:
                      non vengono utilizzati cookie pubblicitari, non vengono tracciate le
                      visualizzazioni a fini di profilazione e nessun dato personale
                      viene condiviso con network pubblicitari esterni. L'utente può
                      eliminare i banner sottoscrivendo l'abbonamento Premium.
                    </p>
                  </div>

                  <div className="space-y-3">
                    <h3 className="text-lg font-semibold">6. Tempi di conservazione</h3>
                    <p>
                      I dati personali vengono conservati per tutto il tempo necessario
                      alla fornitura del servizio e per il periodo previsto dalla
                      normativa applicabile. In particolare:
                    </p>
                    <ul className="list-disc list-inside space-y-2 pl-4">
                      <li>
                        i dati di account vengono conservati fino alla cancellazione
                        dell'account da parte dell'utente o del Titolare;
                      </li>
                      <li>
                        i dati relativi a pagamenti, abbonamenti e fatture vengono
                        conservati per il termine previsto dalla normativa fiscale (di
                        norma 10 anni);
                      </li>
                      <li>
                        i log tecnici e di sicurezza vengono conservati per un periodo
                        proporzionato alle finalità di tutela della piattaforma.
                      </li>
                    </ul>
                  </div>

                  <div className="space-y-3">
                    <h3 className="text-lg font-semibold">7. Sicurezza e data breach</h3>
                    <p>
                      I dati sono trasmessi tramite connessioni crittografate (HTTPS) e
                      protetti da misure tecniche e organizzative coerenti con lo stato
                      dell'arte (controlli di accesso, password cifrate, separazione dei
                      ruoli amministrativi, backup periodici).
                    </p>
                    <p>
                      In caso di violazione dei dati personali (&laquo;data breach&raquo;)
                      che comporti un rischio per i diritti e le libertà degli
                      interessati, il Titolare provvederà a:
                    </p>
                    <ul className="list-disc list-inside space-y-2 pl-4">
                      <li>
                        notificare l'evento al Garante per la protezione dei dati
                        personali entro 72 ore dalla scoperta, ai sensi dell'art. 33
                        GDPR;
                      </li>
                      <li>
                        comunicare l'evento agli utenti interessati senza ingiustificato
                        ritardo, ai sensi dell'art. 34 GDPR, qualora la violazione possa
                        comportare un rischio elevato per i loro diritti;
                      </li>
                      <li>
                        adottare le misure correttive necessarie a contenere gli effetti
                        della violazione e a prevenirne il ripetersi.
                      </li>
                    </ul>
                  </div>

                  <div className="space-y-3">
                    <h3 className="text-lg font-semibold">8. Minori</h3>
                    <p>
                      Il servizio è riservato a soggetti maggiorenni. Il Titolare non
                      raccoglie consapevolmente dati personali di soggetti di età inferiore
                      ai 18 anni. Qualora il Titolare venga a conoscenza della presenza di
                      un account riconducibile a un minore, provvederà a rimuoverlo e a
                      cancellare i relativi dati.
                    </p>
                  </div>

                  <div className="space-y-3">
                    <h3 className="text-lg font-semibold">9. Diritti dell'interessato</h3>
                    <p>
                      Ai sensi degli artt. 15-22 GDPR, l'utente ha diritto di:
                    </p>
                    <ul className="list-disc list-inside space-y-2 pl-4">
                      <li>accedere ai propri dati personali;</li>
                      <li>chiederne la rettifica o l'integrazione;</li>
                      <li>
                        chiederne la cancellazione (&laquo;diritto all'oblio&raquo;) o la
                        limitazione del trattamento;
                      </li>
                      <li>
                        opporsi al trattamento per motivi legittimi o, in qualsiasi
                        momento, al trattamento per finalità di marketing;
                      </li>
                      <li>
                        ricevere i propri dati in un formato strutturato e leggibile da
                        dispositivo automatico (portabilità);
                      </li>
                      <li>
                        revocare in qualsiasi momento il consenso prestato, senza che ciò
                        pregiudichi la liceità del trattamento effettuato in precedenza;
                      </li>
                      <li>
                        proporre reclamo al Garante per la protezione dei dati personali
                        (Piazza Venezia 11, 00187 Roma —{" "}
                        <a
                          href="https://www.garanteprivacy.it/"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline"
                        >
                          www.garanteprivacy.it
                        </a>
                        ).
                      </li>
                    </ul>
                    <p>
                      Per esercitare tali diritti è sufficiente inviare una e-mail a{" "}
                      <a
                        href={`mailto:${TITOLARE_EMAIL}`}
                        className="text-primary hover:underline"
                      >
                        {TITOLARE_EMAIL}
                      </a>
                      . L'utente può inoltre richiedere la cancellazione dell'account
                      direttamente dall'area personale del Sito.
                    </p>
                  </div>

                  <div className="space-y-3">
                    <h3 className="text-lg font-semibold">10. Modifiche all'informativa</h3>
                    <p>
                      La presente informativa può essere aggiornata in qualsiasi momento.
                      Le modifiche saranno pubblicate su questa pagina, con indicazione
                      della data di ultimo aggiornamento. L'utilizzo continuato del
                      servizio dopo la pubblicazione delle modifiche costituisce
                      accettazione delle stesse.
                    </p>
                  </div>
                </div>
              </TabsContent>

              {/* ============================================================ */}
              {/* TERMINI E CONDIZIONI                                          */}
              {/* ============================================================ */}
              <TabsContent
                value="terms"
                className="space-y-6 mt-6 text-sm max-h-[600px] overflow-y-auto pr-2"
              >
                <div className="space-y-4">
                  <h2 className="text-2xl font-bold">Termini e Condizioni di Servizio</h2>

                  <div className="space-y-3">
                    <h3 className="text-lg font-semibold">1. Premessa</h3>
                    <p>
                      {NOME_SITO} è una piattaforma online di socializzazione e dating
                      che consente agli utenti di creare un profilo, conoscersi, scambiarsi
                      messaggi e partecipare a minigame interattivi (Tris, Dama) con un
                      sistema di punteggio ELO.
                    </p>
                    <p>
                      Il servizio è erogato dal Titolare ({TITOLARE_NOME},{" "}
                      {TITOLARE_LUOGO}) ed è raggiungibile all'indirizzo{" "}
                      <a
                        href={URL_SITO}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                      >
                        {URL_SITO}
                      </a>
                      . Iscrivendosi al Sito l'utente accetta integralmente i presenti
                      Termini e Condizioni.
                    </p>
                  </div>

                  <div className="space-y-3">
                    <h3 className="text-lg font-semibold">2. Requisiti di accesso</h3>
                    <p>
                      L'accesso a {NOME_SITO} è consentito esclusivamente a persone fisiche
                      che abbiano compiuto 18 anni di età e siano in possesso della piena
                      capacità di agire. L'utente è personalmente responsabile della
                      veridicità delle informazioni fornite al momento dell'iscrizione.
                    </p>
                  </div>

                  <div className="space-y-3">
                    <h3 className="text-lg font-semibold">3. Registrazione e account</h3>
                    <p>
                      Per utilizzare il servizio è necessario registrare un account
                      fornendo un indirizzo e-mail valido e scegliendo una password sicura.
                      L'utente si impegna a:
                    </p>
                    <ul className="list-disc list-inside space-y-2 pl-4">
                      <li>
                        fornire dati veritieri e tenerli aggiornati;
                      </li>
                      <li>
                        custodire con cura le proprie credenziali e non condividerle con
                        terzi;
                      </li>
                      <li>
                        comunicare tempestivamente al Titolare qualsiasi sospetta
                        compromissione dell'account.
                      </li>
                    </ul>
                    <p>
                      Ogni utente può possedere un solo account. La creazione di account
                      multipli può comportare la sospensione di tutti gli account collegati.
                    </p>
                  </div>

                  <div className="space-y-3">
                    <h3 className="text-lg font-semibold">4. Natura del servizio</h3>
                    <p>
                      {NOME_SITO} è una piattaforma che mette in contatto persone reali.
                      Gli utenti agiscono in piena autonomia e il Titolare si limita a
                      fornire gli strumenti tecnici per la comunicazione. Il Titolare non
                      è parte dei rapporti che eventualmente nascono tra gli utenti e non
                      garantisce esiti, incontri o relazioni.
                    </p>
                    <p>
                      Il Titolare non effettua controlli sui precedenti penali degli
                      utenti né verifica caso per caso la veridicità delle informazioni
                      pubblicate sui profili. Agli utenti è raccomandata prudenza nelle
                      interazioni, sia online sia offline.
                    </p>
                  </div>

                  <div className="space-y-3">
                    <h3 className="text-lg font-semibold">5. Contenuti pubblicati dagli utenti</h3>
                    <p>
                      L'utente è il solo responsabile dei contenuti (immagini, testi,
                      messaggi vocali, brani selezionati, descrizioni) che pubblica o
                      invia tramite la piattaforma. Caricando un contenuto, l'utente
                      dichiara di avere il diritto di farlo e concede al Titolare una
                      licenza non esclusiva, limitata al funzionamento del servizio, per
                      la sua memorizzazione e visualizzazione agli altri utenti.
                    </p>
                    <p>Sono in ogni caso vietati i contenuti che:</p>
                    <ul className="list-disc list-inside space-y-2 pl-4">
                      <li>
                        ritraggono persone diverse dall'utente senza il loro consenso;
                      </li>
                      <li>
                        contengono nudità esplicita, atti sessuali o materiale
                        pornografico;
                      </li>
                      <li>
                        coinvolgono minori in qualsiasi forma;
                      </li>
                      <li>
                        incitano all'odio, alla discriminazione o alla violenza,
                        compresi contenuti razzisti, omofobi, sessisti, religiosamente
                        offensivi;
                      </li>
                      <li>
                        sono diffamatori, ingannevoli, lesivi della dignità altrui o
                        violano diritti di proprietà intellettuale di terzi;
                      </li>
                      <li>
                        promuovono attività illecite o utilizzano la piattaforma per
                        scopi commerciali non autorizzati (spam, prostituzione, escort,
                        ecc.).
                      </li>
                    </ul>
                    <p>
                      Il Titolare si riserva il diritto di rimuovere, oscurare o segnalare
                      alle autorità competenti i contenuti che violino le presenti regole
                      o la legge applicabile.
                    </p>
                  </div>

                  <div className="space-y-3">
                    <h3 className="text-lg font-semibold">6. Crediti e abbonamenti</h3>
                    <p>
                      {NOME_SITO} utilizza un sistema di <strong>crediti virtuali</strong>{" "}
                      per accedere ad alcune funzionalità (ad esempio: invio di like
                      aggiuntivi, sblocco di chat, partite extra ai minigame). I crediti
                      possono essere acquistati a pacchetti tramite Stripe.
                    </p>
                    <p>
                      In alternativa è disponibile un{" "}
                      <strong>abbonamento Premium</strong> che fornisce crediti illimitati
                      o un set ampliato di funzionalità (a titolo esemplificativo: like
                      illimitati, visualizzazione di chi ha messo like, invio di messaggi
                      vocali, sblocco diretto delle chat). Il dettaglio puntuale dei
                      benefici dell'abbonamento è quello indicato sul Sito al momento
                      della sottoscrizione.
                    </p>
                    <p>
                      I crediti sono utilizzabili esclusivamente all'interno di{" "}
                      {NOME_SITO}, non possono essere convertiti in denaro, ceduti a terzi
                      o rimborsati una volta utilizzati. Il Titolare può modificare i
                      prezzi, i pacchetti o i benefici dell'abbonamento dandone
                      comunicazione sul Sito; le modifiche non incidono sugli abbonamenti
                      già attivi fino alla loro scadenza.
                    </p>
                  </div>

                  <div className="space-y-3">
                    <h3 className="text-lg font-semibold">6.1 Regalo di un abbonamento</h3>
                    <p>
                      Un utente può acquistare un abbonamento a beneficio di un altro
                      utente, tramite l'apposita funzione &laquo;Regala&raquo;. In tal caso:
                    </p>
                    <ul className="list-disc list-inside space-y-2 pl-4">
                      <li>
                        il pagamento è a carico del mittente; il beneficio viene attivato
                        sull'account del destinatario;
                      </li>
                      <li>
                        l'operazione è vincolante e non rimborsabile, anche qualora il
                        destinatario non utilizzi il servizio;
                      </li>
                      <li>
                        nessun dato di pagamento del mittente viene mai condiviso con il
                        destinatario.
                      </li>
                    </ul>
                    <p>
                      Il Titolare può annullare un regalo in caso di frode, abuso o
                      violazione dei presenti Termini.
                    </p>
                  </div>

                  <div className="space-y-3">
                    <h3 className="text-lg font-semibold">6.2 Rinnovo automatico dell'abbonamento</h3>
                    <p>
                      L'abbonamento Premium si rinnova automaticamente alla scadenza del
                      periodo sottoscritto (settimanale, mensile o secondo la durata
                      indicata al momento dell'acquisto), addebitando il corrispettivo
                      sullo stesso strumento di pagamento utilizzato per la prima
                      sottoscrizione, salvo che l'utente abbia disattivato il rinnovo
                      automatico prima della scadenza.
                    </p>
                    <ul className="list-disc list-inside space-y-2 pl-4">
                      <li>
                        L'utente può <strong>disattivare il rinnovo automatico in
                        qualsiasi momento</strong> dalla propria area personale del Sito
                        o dal portale clienti di Stripe collegato al proprio account;
                      </li>
                      <li>
                        la disattivazione del rinnovo non interrompe l'abbonamento in
                        corso: l'utente continuerà ad usufruire dei benefici Premium fino
                        alla fine del periodo già pagato;
                      </li>
                      <li>
                        in caso di mancato addebito (carta scaduta, fondi insufficienti,
                        ecc.) il Titolare potrà tentare nuovi addebiti nei giorni
                        successivi o sospendere l'abbonamento;
                      </li>
                      <li>
                        eventuali variazioni dei prezzi o delle condizioni dell'abbonamento
                        saranno comunicate con un congruo preavviso, e l'utente potrà
                        recedere prima dell'applicazione delle modifiche.
                      </li>
                    </ul>
                  </div>

                  <div className="space-y-3">
                    <h3 className="text-lg font-semibold">7. Pagamenti</h3>
                    <p>
                      I pagamenti sono gestiti tramite Stripe. {NOME_SITO} non memorizza
                      i dati delle carte di pagamento. Le fatture e le ricevute, se
                      richieste, vengono emesse secondo la normativa fiscale italiana.
                    </p>
                  </div>

                  <div className="space-y-3">
                    <h3 className="text-lg font-semibold">8. Diritto di recesso</h3>
                    <p>
                      Ai sensi dell'art. 59, comma 1, lett. o) del Codice del Consumo
                      (D.lgs. 206/2005), il diritto di recesso è escluso per la fornitura
                      di contenuto digitale mediante un supporto non materiale qualora
                      l'esecuzione sia iniziata con l'accordo espresso del consumatore e
                      con la sua accettazione del fatto che, in tal caso, avrebbe perso
                      tale diritto.
                    </p>
                    <p>
                      Al momento dell'acquisto di crediti o dell'attivazione di un
                      abbonamento, l'utente accetta espressamente che l'esecuzione
                      cominci immediatamente e dichiara di essere informato della
                      conseguente perdita del diritto di recesso. Resta in ogni caso
                      possibile disattivare il rinnovo automatico dell'abbonamento dalla
                      propria area personale.
                    </p>
                  </div>

                  <div className="space-y-3">
                    <h3 className="text-lg font-semibold">9. Messaggi vocali</h3>
                    <p>
                      Gli utenti con abbonamento Premium attivo possono inviare messaggi
                      vocali all'interno delle chat. Gli utenti senza abbonamento possono
                      ricevere e ascoltare i messaggi vocali, ma non inviarne.
                    </p>
                    <p>
                      Inviando un messaggio vocale l'utente acconsente alla
                      memorizzazione del file audio per il tempo necessario alla
                      fruizione del servizio. È vietato registrare o diffondere
                      conversazioni vocali altrui senza il consenso dei partecipanti, in
                      conformità alla normativa applicabile.
                    </p>
                  </div>

                  <div className="space-y-3">
                    <h3 className="text-lg font-semibold">10. Minigame e classifica ELO</h3>
                    <p>
                      Il Sito offre minigame (attualmente Tris e Dama) giocabili tra
                      utenti. La partecipazione modifica il punteggio ELO dell'utente
                      secondo le regole di volta in volta indicate sul Sito (per
                      esempio: aumento del punteggio in caso di vittoria, diminuzione in
                      caso di sconfitta, attribuzione di crediti per le vittorie).
                    </p>
                    <p>
                      Sul Sito può essere mostrata una classifica dei migliori giocatori.
                      L'inserimento nella classifica avviene automaticamente in base ai
                      risultati di gioco. È vietato utilizzare bot, automatismi o
                      stratagemmi per alterare i risultati; in tali casi il Titolare può
                      annullare i punti, i crediti acquisiti e l'account stesso.
                    </p>
                  </div>

                  <div className="space-y-3">
                    <h3 className="text-lg font-semibold">11. Notifiche push</h3>
                    <p>
                      Se l'utente autorizza le notifiche dal proprio browser, {NOME_SITO}
                      può inviare notifiche push relative a nuovi messaggi, like, match o
                      comunicazioni di servizio. Le notifiche possono essere disattivate
                      in qualsiasi momento dalle impostazioni del browser o del Sito.
                    </p>
                  </div>

                  <div className="space-y-3">
                    <h3 className="text-lg font-semibold">12. Limitazione di responsabilità</h3>
                    <p>
                      {NOME_SITO} è fornito &laquo;così com'è&raquo;. Il Titolare si
                      impegna a garantire la continuità e la qualità del servizio, ma non
                      può assicurare l'assenza di interruzioni, errori o
                      malfunzionamenti, soprattutto quando dipendenti da terze parti
                      (Supabase, Vercel, Stripe, gestori di rete).
                    </p>
                    <p>
                      Fatta salva l'ipotesi di dolo o colpa grave, e nei limiti consentiti
                      dalla legge, il Titolare non è responsabile dei danni, diretti o
                      indiretti, derivanti da:
                    </p>
                    <ul className="list-disc list-inside space-y-2 pl-4">
                      <li>
                        contenuti pubblicati o messaggi inviati dagli utenti;
                      </li>
                      <li>
                        comportamenti tenuti dagli utenti, sia online sia offline;
                      </li>
                      <li>
                        interruzioni, rallentamenti o perdite di dati dovute a cause non
                        imputabili al Titolare.
                      </li>
                    </ul>
                  </div>

                  <div className="space-y-3">
                    <h3 className="text-lg font-semibold">
                      13. Segnalazioni, moderazione e contenuti illegali
                    </h3>
                    <p>
                      {NOME_SITO} si conforma al Regolamento (UE) 2022/2065
                      (&laquo;Digital Services Act&raquo;) per la parte applicabile ai
                      servizi di intermediazione di hosting di contenuti generati dagli
                      utenti.
                    </p>
                    <p className="font-semibold mt-3">Punto di contatto</p>
                    <p>
                      Per le segnalazioni di contenuti illegali, per le richieste delle
                      autorità competenti e per ogni comunicazione relativa alla
                      moderazione, il punto di contatto unico è l'indirizzo e-mail{" "}
                      <a
                        href={`mailto:${TITOLARE_EMAIL}`}
                        className="text-primary hover:underline"
                      >
                        {TITOLARE_EMAIL}
                      </a>
                      . La lingua di comunicazione è l'italiano (è accettato anche
                      l'inglese).
                    </p>
                    <p className="font-semibold mt-3">Procedura di segnalazione</p>
                    <p>
                      Qualsiasi utente o terzo può segnalare la presenza di contenuti
                      che ritiene illegali o in violazione dei presenti Termini, tramite
                      gli strumenti di segnalazione presenti sul Sito o scrivendo
                      all'indirizzo del Titolare. La segnalazione dovrebbe contenere:
                    </p>
                    <ul className="list-disc list-inside space-y-2 pl-4">
                      <li>
                        una descrizione del contenuto e dei motivi per cui è ritenuto
                        illegale o in violazione;
                      </li>
                      <li>
                        l'indicazione precisa del profilo, del messaggio o del contenuto
                        oggetto della segnalazione;
                      </li>
                      <li>
                        i dati di contatto del segnalante (salvo le segnalazioni anonime
                        per reati gravi);
                      </li>
                      <li>
                        una dichiarazione di buona fede sulla veridicità della
                        segnalazione.
                      </li>
                    </ul>
                    <p>
                      Il Titolare valuta le segnalazioni in tempi ragionevoli e, ove le
                      ritenga fondate, può rimuovere il contenuto, sospendere
                      l'account, limitarne la visibilità o adottare altre misure
                      proporzionate, informando l'utente coinvolto della decisione e
                      delle relative motivazioni.
                    </p>
                    <p className="font-semibold mt-3">Reclami contro le decisioni</p>
                    <p>
                      Qualora un utente ritenga che una decisione di moderazione
                      (rimozione di un contenuto, sospensione dell'account, limitazione
                      della visibilità) sia ingiustificata, può presentare reclamo
                      scrivendo a{" "}
                      <a
                        href={`mailto:${TITOLARE_EMAIL}`}
                        className="text-primary hover:underline"
                      >
                        {TITOLARE_EMAIL}
                      </a>
                      , entro 60 giorni dalla decisione. Il Titolare riesaminerà il caso
                      e comunicherà l'esito senza ingiustificato ritardo. Resta in ogni
                      caso ferma la possibilità di rivolgersi all'autorità giudiziaria
                      ordinaria.
                    </p>
                    <p className="font-semibold mt-3">Uso improprio delle segnalazioni</p>
                    <p>
                      L'utilizzo della funzione di segnalazione per finalità ritorsive o
                      manifestamente infondate (per esempio per ripicca dopo un rifiuto
                      sentimentale) è vietato e può comportare la sospensione
                      dell'account del segnalante. Le segnalazioni gravemente diffamatorie
                      possono inoltre dar luogo a responsabilità civile e penale.
                    </p>
                  </div>

                  <div className="space-y-3">
                    <h3 className="text-lg font-semibold">14. Casi gravi e cooperazione con le autorità</h3>
                    <p>
                      Per la natura del servizio, {NOME_SITO} adotta una linea di
                      tolleranza zero nei confronti di comportamenti gravi quali:
                    </p>
                    <ul className="list-disc list-inside space-y-2 pl-4">
                      <li>
                        diffusione non consensuale di immagini o video intimi
                        (&laquo;revenge porn&raquo;);
                      </li>
                      <li>
                        ricatti, estorsioni e richieste di denaro a sfondo sessuale
                        (&laquo;sextortion&raquo;);
                      </li>
                      <li>
                        molestie reiterate, stalking, minacce;
                      </li>
                      <li>
                        adescamento di minori e qualsiasi contenuto che li coinvolga;
                      </li>
                      <li>
                        sfruttamento della prostituzione o tratta di esseri umani;
                      </li>
                      <li>
                        truffe romantiche e raccolte fraudolente di denaro.
                      </li>
                    </ul>
                    <p>
                      Gli utenti vittima di tali condotte sono invitati a:
                    </p>
                    <ul className="list-disc list-inside space-y-2 pl-4">
                      <li>
                        segnalare immediatamente l'episodio al Titolare scrivendo a{" "}
                        <a
                          href={`mailto:${TITOLARE_EMAIL}`}
                          className="text-primary hover:underline"
                        >
                          {TITOLARE_EMAIL}
                        </a>
                        ;
                      </li>
                      <li>
                        denunciare il fatto alla{" "}
                        <strong>Polizia Postale e delle Comunicazioni</strong> tramite il
                        portale{" "}
                        <a
                          href="https://www.commissariatodips.it/"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline"
                        >
                          www.commissariatodips.it
                        </a>{" "}
                        o presso il più vicino ufficio di Polizia o Carabinieri;
                      </li>
                      <li>
                        in caso di diffusione non consensuale di immagini intime,
                        attivare la procedura di tutela presso il Garante per la
                        protezione dei dati personali (&laquo;Revenge porn -
                        segnalazione preventiva&raquo;), disponibile su{" "}
                        <a
                          href="https://www.garanteprivacy.it/"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline"
                        >
                          www.garanteprivacy.it
                        </a>
                        .
                      </li>
                    </ul>
                    <p>
                      Il Titolare collabora con le autorità competenti rispondendo alle
                      richieste legittime e legalmente fondate, nei limiti previsti dalla
                      normativa applicabile, e può conservare i dati strettamente
                      necessari ai fini dell'eventuale procedimento.
                    </p>
                  </div>

                  <div className="space-y-3">
                    <h3 className="text-lg font-semibold">15. Sospensione e cancellazione dell'account</h3>
                    <p>
                      Il Titolare può sospendere o cancellare in qualsiasi momento un
                      account in caso di violazione dei Termini, della legge o per ragioni
                      di sicurezza, senza obbligo di rimborso dei crediti o
                      dell'abbonamento eventualmente residuo.
                    </p>
                    <p>
                      L'utente può in qualsiasi momento cancellare il proprio account
                      dalla propria area personale o scrivendo a{" "}
                      <a
                        href={`mailto:${TITOLARE_EMAIL}`}
                        className="text-primary hover:underline"
                      >
                        {TITOLARE_EMAIL}
                      </a>
                      . La cancellazione comporta la rimozione dei dati personali, fatti
                      salvi quelli che il Titolare è tenuto a conservare per legge (per
                      esempio i documenti fiscali).
                    </p>
                  </div>

                  <div className="space-y-3">
                    <h3 className="text-lg font-semibold">16. Proprietà intellettuale</h3>
                    <p>
                      Il nome {NOME_SITO}, il logo, il design del Sito e il relativo
                      software sono di proprietà del Titolare e protetti dalla normativa
                      sul diritto d'autore e sui marchi. È vietata la riproduzione, anche
                      parziale, senza l'autorizzazione scritta del Titolare.
                    </p>
                  </div>

                  <div className="space-y-3">
                    <h3 className="text-lg font-semibold">17. Modifiche ai Termini</h3>
                    <p>
                      I presenti Termini possono essere aggiornati per adeguamenti
                      normativi, evoluzioni del servizio o ragioni organizzative. Le
                      modifiche sono pubblicate su questa pagina, con indicazione della
                      data di ultimo aggiornamento. L'uso continuato del servizio dopo la
                      pubblicazione equivale ad accettazione delle modifiche; in caso
                      contrario l'utente può cancellare il proprio account.
                    </p>
                  </div>

                  <div className="space-y-3">
                    <h3 className="text-lg font-semibold">18. Legge applicabile e foro competente</h3>
                    <p>
                      I presenti Termini sono regolati dalla legge italiana. Per qualsiasi
                      controversia è competente, in via esclusiva, il Foro di Sassari,
                      salvo il diritto del consumatore, ove applicabile, di rivolgersi al
                      foro del luogo di propria residenza o domicilio ai sensi dell'art.
                      66-bis del Codice del Consumo.
                    </p>
                    <p>
                      Resta ferma la possibilità per il consumatore di ricorrere alla
                      piattaforma europea di risoluzione delle controversie online (ODR),
                      disponibile all'indirizzo{" "}
                      <a
                        href="https://ec.europa.eu/consumers/odr/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                      >
                        ec.europa.eu/consumers/odr
                      </a>
                      .
                    </p>
                  </div>

                  <div className="space-y-3">
                    <h3 className="text-lg font-semibold">19. Contatti</h3>
                    <p>
                      Per qualunque comunicazione relativa al servizio o ai presenti
                      Termini è possibile scrivere a{" "}
                      <a
                        href={`mailto:${TITOLARE_EMAIL}`}
                        className="text-primary hover:underline"
                      >
                        {TITOLARE_EMAIL}
                      </a>
                      .
                    </p>
                  </div>

                  <div className="space-y-3 mt-6 pt-4 border-t">
                    <p className="text-xs italic text-muted-foreground">
                      Ai sensi degli artt. 1341 e 1342 c.c., l'utente, completando la
                      registrazione, dichiara di aver letto e di accettare specificamente
                      i seguenti articoli: 4 (Natura del servizio), 6, 6.1 e 6.2 (Crediti,
                      abbonamenti, regalo, rinnovo automatico), 8 (Diritto di recesso),
                      12 (Limitazione di responsabilità), 15 (Sospensione e cancellazione
                      dell'account), 17 (Modifiche ai Termini), 18 (Legge applicabile e
                      foro competente).
                    </p>
                  </div>
                </div>
              </TabsContent>

              {/* ============================================================ */}
              {/* COOKIE POLICY                                                 */}
              {/* ============================================================ */}
              <TabsContent
                value="cookies"
                className="space-y-6 mt-6 text-sm max-h-[600px] overflow-y-auto pr-2"
              >
                <div className="space-y-4">
                  <h2 className="text-2xl font-bold">Cookie Policy</h2>
                  <p className="text-muted-foreground">
                    Questa pagina spiega quali cookie e tecnologie di memorizzazione locale
                    utilizziamo, con quali finalità e come puoi gestirli.
                  </p>

                  <div className="space-y-3">
                    <h3 className="text-lg font-semibold">1. Cosa sono i cookie</h3>
                    <p>
                      I cookie sono piccoli file di testo che un sito invia al browser del
                      dispositivo, dove vengono memorizzati per essere ritrasmessi al sito
                      stesso nelle visite successive. {NOME_SITO} utilizza, oltre ai
                      cookie, anche altri strumenti di memorizzazione locale del browser
                      (localStorage) e un Service Worker per le notifiche push.
                    </p>
                  </div>

                  <div className="space-y-3">
                    <h3 className="text-lg font-semibold">
                      2. Strumenti utilizzati (cookie e memorizzazione locale)
                    </h3>

                    <div className="border border-border p-4 rounded-lg space-y-3">
                      <h4 className="font-semibold text-base">
                        A. Cookie tecnici (non richiedono consenso)
                      </h4>

                      <div>
                        <p className="font-medium">Autenticazione</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          <strong>Nome:</strong> sb-*-auth-token (Supabase)
                          <br />
                          <strong>Finalità:</strong> mantenere l'utente autenticato durante
                          la navigazione.
                          <br />
                          <strong>Durata:</strong> persistente fino al logout o alla
                          scadenza della sessione.
                          <br />
                          <strong>Tipologia:</strong> tecnico di prima parte.
                        </p>
                      </div>

                      <div>
                        <p className="font-medium">Consenso cookie</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          <strong>Nome:</strong> cookieConsent
                          <br />
                          <strong>Finalità:</strong> ricordare la scelta dell'utente
                          rispetto al banner cookie.
                          <br />
                          <strong>Durata:</strong> 12 mesi.
                          <br />
                          <strong>Tipologia:</strong> tecnico di prima parte.
                        </p>
                      </div>
                    </div>

                    <div className="border border-border p-4 rounded-lg space-y-3">
                      <h4 className="font-semibold text-base">
                        B. Memorizzazione locale (localStorage)
                      </h4>

                      <div>
                        <p className="font-medium">Preferenza tema</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          <strong>Nome:</strong> theme
                          <br />
                          <strong>Finalità:</strong> ricordare la scelta tra tema chiaro o
                          scuro.
                          <br />
                          <strong>Durata:</strong> fino a cancellazione manuale.
                        </p>
                      </div>

                      <div>
                        <p className="font-medium">Preferenza lingua</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          <strong>Nome:</strong> i18nextLng
                          <br />
                          <strong>Finalità:</strong> ricordare la lingua scelta tra quelle
                          disponibili.
                          <br />
                          <strong>Durata:</strong> fino a cancellazione manuale.
                        </p>
                      </div>

                      <div>
                        <p className="font-medium">Cache applicativa</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          <strong>Nome:</strong> chiavi varie utilizzate dall'app
                          (memorizzazione temporanea di profili e contenuti già caricati).
                          <br />
                          <strong>Finalità:</strong> rendere più veloce la navigazione.
                          <br />
                          <strong>Durata:</strong> temporanea / di sessione.
                        </p>
                      </div>

                      <div>
                        <p className="font-medium">Consenso e stato della geolocalizzazione</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          <strong>Nome:</strong> geolocationEnabled, geolocationCookieConsent
                          <br />
                          <strong>Finalità:</strong> ricordare la scelta dell'utente
                          sull'utilizzo della geolocalizzazione e non riproporre il banner
                          ad ogni accesso.
                          <br />
                          <strong>Durata:</strong> fino a cancellazione manuale o revoca
                          del consenso.
                        </p>
                      </div>

                      <div>
                        <p className="font-medium">Banner promozionali interni</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          <strong>Nome:</strong> adBanners
                          <br />
                          <strong>Finalità:</strong> memorizzare localmente l'elenco
                          delle immagini dei banner promozionali interni del Sito (offerte
                          di crediti e Premium). Nessun dato di profilazione e nessun
                          identificativo pubblicitario è coinvolto.
                          <br />
                          <strong>Durata:</strong> fino a cancellazione manuale.
                        </p>
                      </div>
                    </div>

                    <div className="border border-border p-4 rounded-lg space-y-3">
                      <h4 className="font-semibold text-base">
                        C. Service Worker e notifiche push
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        <strong>Nome:</strong> sw.js
                        <br />
                        <strong>Finalità:</strong> gestire le notifiche push per nuovi
                        messaggi, like o match. L'attivazione richiede il consenso
                        esplicito dell'utente al momento della prima richiesta del
                        browser.
                        <br />
                        <strong>Durata:</strong> fino alla disinstallazione o alla
                        cancellazione dei dati del browser.
                      </p>
                    </div>

                    <div className="border border-border p-4 rounded-lg space-y-3">
                      <h4 className="font-semibold text-base">
                        D. Geolocalizzazione del browser
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        {NOME_SITO} utilizza l'API standard di geolocalizzazione fornita
                        dal browser (<code>navigator.geolocation</code>) per mostrare
                        profili geograficamente vicini all'utente.
                        <br />
                        <br />
                        <strong>Funzionamento:</strong> al primo utilizzo, il browser
                        richiede esplicitamente all'utente l'autorizzazione ad accedere
                        alla posizione del dispositivo. Solo se l'utente autorizza, il
                        Sito riceve le coordinate. Successivamente, all'interno del
                        Sito, viene richiesto un secondo consenso per memorizzare la
                        preferenza tramite localStorage (vedi sezione B).
                        <br />
                        <br />
                        <strong>Revoca:</strong> l'utente può revocare in qualsiasi
                        momento il permesso dalle impostazioni del proprio browser
                        (sezione &laquo;Autorizzazioni&raquo; o &laquo;Privacy del
                        sito&raquo;) o cancellando le chiavi <code>geolocationEnabled</code>{" "}
                        e <code>geolocationCookieConsent</code> dal localStorage.
                        <br />
                        <br />
                        <strong>Trattamento dei dati di posizione:</strong> vedere la
                        sezione &laquo;Privacy&raquo;, punto 2.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h3 className="text-lg font-semibold">
                      3. Cookie di servizi terzi necessari al funzionamento
                    </h3>
                    <p>
                      Alcune funzionalità si appoggiano a servizi terzi che possono
                      installare cookie tecnici di prima parte sul proprio dominio. In
                      particolare:
                    </p>
                    <ul className="list-disc list-inside space-y-2 pl-4">
                      <li>
                        <strong>Stripe</strong> — utilizzato esclusivamente durante il
                        processo di pagamento. I cookie Stripe sono necessari alla
                        prevenzione delle frodi.
                      </li>
                      <li>
                        <strong>Spotify</strong> — utilizzato per la selezione e
                        l'anteprima dei brani preferiti sul profilo, solo quando l'utente
                        accede alla relativa funzionalità.
                      </li>
                    </ul>
                  </div>

                  <div className="space-y-3">
                    <h3 className="text-lg font-semibold">
                      4. Cookie che NON utilizziamo
                    </h3>
                    <p>
                      Per scelta del Titolare, {NOME_SITO} <strong>non utilizza</strong>:
                    </p>
                    <ul className="list-disc list-inside space-y-2 pl-4">
                      <li>cookie di profilazione pubblicitaria;</li>
                      <li>
                        cookie di analytics di terze parti (Google Analytics, Meta Pixel,
                        ecc.);
                      </li>
                      <li>
                        cookie di tracciamento comportamentale dei social network.
                      </li>
                    </ul>
                    <p>
                      Qualora in futuro tali strumenti venissero integrati, questa policy
                      sarà aggiornata e verrà richiesto un consenso esplicito tramite il
                      banner.
                    </p>
                  </div>

                  <div className="space-y-3">
                    <h3 className="text-lg font-semibold">5. Gestione del consenso</h3>
                    <p>
                      Al primo accesso al Sito viene mostrato un banner che informa
                      dell'utilizzo dei cookie tecnici. I cookie tecnici e i dati di
                      memorizzazione locale necessari al funzionamento del servizio non
                      richiedono consenso, ma sono indispensabili: senza di essi non è
                      possibile, ad esempio, restare autenticati o ricordare la lingua
                      selezionata.
                    </p>
                    <p>
                      L'utente può in ogni momento gestire o eliminare i cookie tramite le
                      impostazioni del proprio browser:
                    </p>
                    <ul className="list-disc list-inside space-y-1 pl-4 text-sm">
                      <li>
                        <strong>Chrome:</strong> Impostazioni → Privacy e sicurezza →
                        Cookie e altri dati dei siti.
                      </li>
                      <li>
                        <strong>Firefox:</strong> Opzioni → Privacy e sicurezza → Cookie e
                        dati dei siti.
                      </li>
                      <li>
                        <strong>Safari:</strong> Preferenze → Privacy → Gestisci dati siti
                        web.
                      </li>
                      <li>
                        <strong>Edge:</strong> Impostazioni → Cookie e autorizzazioni
                        sito.
                      </li>
                    </ul>
                  </div>

                  <div className="space-y-3">
                    <h3 className="text-lg font-semibold">6. Effetti della disattivazione</h3>
                    <ul className="list-disc list-inside space-y-2 pl-4">
                      <li>
                        <strong>Cookie di autenticazione:</strong> la disattivazione o
                        cancellazione comporta la disconnessione dall'account e la
                        necessità di rieffettuare il login.
                      </li>
                      <li>
                        <strong>localStorage:</strong> la cancellazione ripristina i
                        valori predefiniti (tema, lingua, cache).
                      </li>
                      <li>
                        <strong>Service Worker:</strong> la disattivazione impedisce la
                        ricezione di notifiche push, senza compromettere altre
                        funzionalità.
                      </li>
                    </ul>
                  </div>

                  <div className="space-y-3">
                    <h3 className="text-lg font-semibold">7. Contatti e diritti</h3>
                    <p>
                      Per qualsiasi domanda relativa a questa Cookie Policy o per
                      esercitare i propri diritti in materia di protezione dei dati
                      personali (vedi la sezione &laquo;Privacy&raquo;) è possibile
                      scrivere a{" "}
                      <a
                        href={`mailto:${TITOLARE_EMAIL}`}
                        className="text-primary hover:underline font-medium"
                      >
                        {TITOLARE_EMAIL}
                      </a>
                      .
                    </p>
                  </div>

                  <div className="mt-6 p-4 bg-muted rounded-lg">
                    <p className="text-sm">
                      <strong>Ultimo aggiornamento:</strong> {DATA_AGGIORNAMENTO}.
                      <br />
                      Il Titolare si riserva il diritto di aggiornare questa Cookie Policy
                      in qualsiasi momento. Le modifiche sono pubblicate su questa pagina
                      con la data di aggiornamento.
                    </p>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default TermsAndConditions;
