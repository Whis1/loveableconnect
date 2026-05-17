import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft } from "lucide-react";
import { useLanguageDetection } from "@/hooks/useLanguageDetection";
const TermsAndConditions = () => {
  const navigate = useNavigate();
  const {
    t
  } = useTranslation();
  useLanguageDetection();
  return <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50 dark:from-gray-900 dark:to-gray-800 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <Button variant="ghost" onClick={() => {
        if (window.history.state && (window.history.state.idx ?? 0) > 0) {
          navigate(-1);
        } else {
          navigate("/");
        }
      }} className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          {t('terms.back')}
        </Button>

        <Card>
          <CardHeader>
            <CardTitle className="text-2xl md:text-3xl text-center">
              {t('terms.title')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="privacy" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="privacy">{t('terms.privacy')}</TabsTrigger>
                <TabsTrigger value="terms">{t('terms.termsAndConditions')}</TabsTrigger>
                <TabsTrigger value="cookies">{t('terms.cookies')}</TabsTrigger>
              </TabsList>

              <TabsContent value="privacy" className="space-y-6 mt-6 text-sm max-h-[600px] overflow-y-auto">
                <div className="space-y-4">
                  <h2 className="text-2xl font-bold">🔒 INFORMATIVA SULLA PRIVACY</h2>
                  
                  <div className="space-y-3">
                    <h3 className="text-lg font-semibold">1. Dati raccolti</h3>
                    <p>LoveableConnect raccoglie le seguenti informazioni:</p>
                    <ul className="list-disc list-inside space-y-2 pl-4">
                      <li>dati di registrazione (nome, email, età, genere, orientamento);</li>
                      <li>dati di utilizzo (like, messaggi, attività di navigazione);</li>
                      <li>immagini e descrizioni del profilo.</li>
                    </ul>
                  </div>

                  <div className="space-y-3">
                    <h3 className="text-lg font-semibold">2. Finalità del trattamento</h3>
                    <p>I dati vengono trattati per:</p>
                    <ul className="list-disc list-inside space-y-2 pl-4">
                      <li>permettere la creazione e la gestione del profilo utente;</li>
                      <li>consentire l'interazione con altri utenti;</li>
                      <li>gestire abbonamenti e crediti;</li>
                      <li>migliorare l'esperienza del servizio.</li>
                    </ul>
                  </div>

                  <div className="space-y-3">
                    <h3 className="text-lg font-semibold">3. Base giuridica</h3>
                    <p>
                      Il trattamento si basa sul consenso dell'utente, espresso al momento della registrazione e dell'accettazione dei presenti termini.
                    </p>
                  </div>

                  <div className="space-y-3">
                    <h3 className="text-lg font-semibold">4. Conservazione dei dati</h3>
                    <p>
                      I dati vengono conservati fino alla cancellazione dell'account o richiesta di eliminazione.
                      L'utente può in qualsiasi momento chiedere la cancellazione dei propri dati scrivendo a: <a href="mailto:loveableconnect@hotmail.com" className="text-primary hover:underline">loveableconnect@hotmail.com</a>
                    </p>
                  </div>

                  <div className="space-y-3">
                    <h3 className="text-lg font-semibold">5. Sicurezza</h3>
                    <p>
                      I dati sono protetti tramite connessioni crittografate e sistemi di sicurezza conformi al GDPR.
                      LoveableConnect non condivide dati personali con terzi senza consenso esplicito.
                    </p>
                  </div>

                  <div className="space-y-3">
                    <h3 className="text-lg font-semibold">6. Dati vocali</h3>
                    <p>
                      Per la funzione di messaggi vocali, LoveableConnect tratta dati audio (voce) e metadati associati (ID utente, durata, data di invio).
                      I dati vengono conservati in forma sicura per il solo tempo necessario alla fruizione del servizio e possono essere rimossi su richiesta o al termine del periodo di conservazione.
                      L'utente, utilizzando la funzione, acconsente espressamente al trattamento di tali dati per fini di comunicazione tra utenti.
                    </p>
                  </div>

                  <div className="space-y-3">
                    <h3 className="text-lg font-semibold">7. Trattamento dati per regali di abbonamento</h3>
                    <p>
                      Nel caso di utilizzo della funzione "Regala abbonamento", LoveableConnect raccoglie e tratta i dati personali di entrambe le parti coinvolte:
                    </p>
                    <ul className="list-disc list-inside space-y-2 pl-4">
                      <li>mittente (utente che effettua il regalo)</li>
                      <li>destinatario (utente che riceve l'abbonamento)</li>
                    </ul>
                    <p className="mt-3">
                      I dati trattati includono identificativi utente, data dell'operazione, importo, tipo di abbonamento e informazioni di transazione.
                      Tali dati sono utilizzati esclusivamente per:
                    </p>
                    <ul className="list-disc list-inside space-y-2 pl-4">
                      <li>elaborare e consegnare l'abbonamento al destinatario;</li>
                      <li>adempiere agli obblighi fiscali e contabili;</li>
                      <li>prevenire abusi o attività fraudolente.</li>
                    </ul>
                    <p className="mt-3">
                      Nessuna informazione finanziaria (come i dati della carta) viene condivisa tra utenti.
                      LoveableConnect non consente ai destinatari di risalire ai dettagli del metodo di pagamento del mittente.
                    </p>
                  </div>

                  <div className="space-y-3">
                    <h3 className="text-lg font-semibold">8. Dati dei minigame</h3>
                    <p className="font-semibold">Raccolta e utilizzo dei dati</p>
                    <p>
                      LoveableConnect raccoglie dati relativi alle performance nei minigame (punti ELO e crediti) per permettere il corretto funzionamento dei giochi, calcolare i punteggi e aggiornare la classifica.
                    </p>
                    <p className="font-semibold mt-3">Dati pubblici</p>
                    <p>
                      Solo i dati dei Top 5 giocatori vengono resi pubblici nella classifica visibile a tutti gli utenti. Nessun altro dato di gioco viene condiviso pubblicamente.
                    </p>
                    <p className="font-semibold mt-3">Protezione dei dati</p>
                    <p>
                      Tutti i dati di gioco sono trattati in conformità alla normativa vigente sulla protezione dei dati personali e non saranno condivisi con terze parti non autorizzate.
                    </p>
                  </div>

                  <h2 className="text-2xl font-bold mt-8">INFORMATIVA PRIVACY CONTATTI</h2>
                  
                  <div className="space-y-3">
                    <h3 className="text-lg font-semibold">COME CONTATTARCI?</h3>
                    <p>
                      Il Titolare tiene nella massima considerazione il diritto alla privacy e alla protezione dei dati personali dei propri Utenti.
                      Per ogni informazione in relazione alla presente informativa privacy, gli Utenti possono contattare il Titolare in qualsiasi momento, utilizzando le seguenti modalità.
                    </p>
                    <p className="font-medium">
                      Direttamente online:<br />
                      Tramite Posta: <a href="mailto:loveableconnect@hotmail.com" className="text-primary hover:underline">loveableconnect@hotmail.com</a>
                    </p>
                  </div>

                  <div className="space-y-3">
                    <h3 className="text-lg font-semibold">COSA FACCIAMO? – FINALITÀ DEL TRATTAMENTO</h3>
                    <p>
                      L'Utente può contattare il Titolare attraverso l'apposito form, tramite la navigazione del Sito o dell'App, via e-mail o eventualmente con altra modalità indicata dal Titolare. In relazione a tali attività, il Titolare raccoglie dati personali relativi agli Utenti.
                    </p>
                    <p>
                      Questo Sito e questa App e i servizi eventualmente offerti tramite essi sono riservati a soggetti che hanno compiuto il diciottesimo anno di età. Il Titolare non raccoglie quindi dati personali relativi ai soggetti minori di anni 18. Su richiesta degli Utenti, il Titolare cancellerà tempestivamente tutti i dati personali involontariamente raccolti e relativi a soggetti minori di anni 18.
                    </p>
                    <p>In particolare, i dati personali degli Utenti saranno lecitamente trattati per le seguenti finalità di trattamento:</p>
                    
                    <ol className="list-decimal list-inside space-y-3 pl-4">
                      <li>
                        <strong>evadere la richiesta dell'Utente:</strong> i dati personali degli Utenti sono raccolti e trattati dal Titolare al solo fine di evadere la loro richiesta. I dati dell'Utente raccolti dal Titolare a tale fine includono nome, cognome, e-mail e tutti gli ulteriori dati dell'Utente eventualmente e volontariamente comunicati dall'Utente stesso. Nessun altro trattamento verrà effettuato dal Titolare in relazione ai dati personali degli Utenti. Fermo restando quanto previsto altrove in questa informativa privacy, in nessun caso il Titolare renderà accessibili agli altri Utenti e/o a terzi i dati personali degli Utenti;
                      </li>
                      <li>
                        <strong>finalità amministrativo-contabili:</strong> ovvero per svolgere attività di natura organizzativa, amministrativa, finanziaria e contabile, quali attività organizzative interne ed attività funzionali all'adempimento di obblighi contrattuali e precontrattuali;
                      </li>
                      <li>
                        <strong>obblighi di legge:</strong> ovvero per adempiere ad obblighi previsti dalla legge, da un'autorità, da un regolamento o dalla normativa europea.
                      </li>
                    </ol>

                    <p className="italic">
                      Il conferimento dei dati personali per le finalità di trattamento sopra indicate è facoltativo ma necessario, poiché il mancato conferimento degli stessi comporterà l'impossibilità per l'Utente di effettuare la propria richiesta al Titolare.
                    </p>
                  </div>

                  <div className="space-y-3">
                    <h3 className="text-lg font-semibold">BASE GIURIDICA</h3>
                    <p>
                      <strong>Evasione della richiesta dell'Utente:</strong> la base giuridica consiste nell'art. 6, comma 1, lett. b) del Regolamento, in quanto il trattamento è necessario all'esecuzione di un contratto e/o all'esecuzione di misure precontrattuali adottate su richiesta dell'Utente.
                    </p>
                    <p>
                      <strong>Finalità amministrativo-contabili:</strong> la base giuridica consiste nell'art. 6, comma 1, lett. b) del Regolamento, in quanto il trattamento è necessario all'esecuzione di un contratto e/o all'esecuzione di misure precontrattuali adottate su richiesta dell'Utente.
                    </p>
                    <p>
                      <strong>Obblighi di legge:</strong> la base giuridica consiste nell'art. 6, comma 1, lett. c) del Regolamento, in quanto il trattamento è necessario per adempiere un obbligo legale al quale è soggetto il Titolare del trattamento.
                    </p>
                  </div>

                  <div className="space-y-3">
                    <h3 className="text-lg font-semibold">MODALITÀ DI TRATTAMENTO E TEMPI DI CONSERVAZIONE DEI DATI</h3>
                    <p>
                      Il Titolare tratterà i dati personali degli Utenti mediante strumenti manuali ed informatici, con logiche strettamente correlate alle finalità stesse e, comunque, in modo da garantire la sicurezza e la riservatezza dei dati stessi.
                    </p>
                    <p>
                      I dati personali degli Utenti saranno conservati per i tempi strettamente necessari ad espletare le finalità primarie (come descritto al precedente paragrafo 3), o comunque secondo quanto necessario per la tutela in sede civilistica degli interessi del Titolare e degli Utenti.
                    </p>
                  </div>

                  <div className="space-y-3">
                    <h3 className="text-lg font-semibold">AMBITO DI COMUNICAZIONE E DIFFUSIONE DEI DATI</h3>
                    <p>
                      I dati personali dell'Utente potranno essere trasferiti al di fuori dell'Unione Europea e, in tal caso, il Titolare si assicurerà che il trasferimento avvenga in conformità alla Normativa Applicabile e, in particolare, in conformità agli artt. 45 (Trasferimento sulla base di una decisione di adeguatezza) e 46 (Trasferimento soggetto a garanzie adeguate) del Regolamento.
                    </p>
                    <p>
                      Potranno venire a conoscenza dei dati personali degli Utenti i dipendenti e/o collaboratori del Titolare incaricati di gestire il Sito e l'App e le richieste degli Utenti. Tali soggetti, che sono stati istruiti in tal senso dal Titolare ai sensi dell'art. 29 del Regolamento, tratteranno i dati degli Utenti esclusivamente per le finalità indicate nella presente informativa e nel rispetto delle previsioni della Normativa Applicabile.
                    </p>
                    <p>
                      Potranno inoltre venire a conoscenza dati personali degli Utenti i soggetti terzi che potranno trattare dati personali per conto del Titolare in qualità di Responsabili del Trattamento ai sensi dell'art. 28 del Regolamento, quali, a titolo esemplificativo, fornitori di servizi informatici e logistici funzionali all'operatività del Sito e dell'App del Titolare, fornitori di servizi in outsourcing o cloud computing, professionisti e consulenti.
                    </p>
                    <p>
                      L'Utente ha il diritto di ottenere una lista degli eventuali responsabili del trattamento nominati dal Titolare, facendone richiesta al Titolare con le modalità indicate al successivo paragrafo 7.
                    </p>
                  </div>

                  <div className="space-y-3">
                    <h3 className="text-lg font-semibold">DIRITTI DEGLI INTERESSATI</h3>
                    <p>
                      L'Utente potrà esercitare i diritti garantiti dalla Normativa Applicabile in qualsiasi momento, contattando il Titolare con le seguenti modalità.
                    </p>
                    <p>
                      <strong>Tramite Posta:</strong><br />
                      Gli Utenti possono anche contattare il Responsabile della protezione dei dati (RPD o DPO) del Titolare, i cui dati di contatto sono di seguito riportati: e-mail <a href="mailto:loveableconnect@hotmail.com" className="text-primary hover:underline">loveableconnect@hotmail.com</a>
                    </p>
                    <p>
                      Ai sensi della Normativa Applicabile, l'Utente ha il diritto di ottenere l'indicazione (i) dell'origine dei dati personali; (ii) delle finalità e modalità del trattamento; (iii) della logica applicata in caso di trattamento effettuato con l'ausilio di strumenti elettronici; (iv) degli estremi identificativi del titolare e dei responsabili; (v) dei soggetti o delle categorie di soggetti ai quali i dati personali possono essere comunicati o che possono venirne a conoscenza in qualità di responsabili o incaricati.
                    </p>
                    <p>Inoltre, l'Utente ha il diritto di ottenere:</p>
                    <ul className="list-disc list-inside space-y-2 pl-4">
                      <li>l'accesso, l'aggiornamento, la rettificazione ovvero, quando vi hai interesse, l'integrazione dei dati;</li>
                      <li>la cancellazione, la trasformazione in forma anonima o la limitazione dei dati trattati in violazione di legge, compresi quelli di cui non è necessaria la conservazione in relazione agli scopi per i quali i dati sono stati raccolti o successivamente trattati;</li>
                      <li>l'attestazione che le operazioni di cui alle lettere a) e b) sono state portate a conoscenza, anche per quanto riguarda il loro contenuto, di coloro ai quali i dati sono stati comunicati o diffusi, eccettuato il caso in cui tale adempimento si rivela impossibile o comporta un impiego di mezzi manifestamente sproporzionato rispetto al diritto tutelato.</li>
                    </ul>
                    <p>Nonché:</p>
                    <ul className="list-disc list-inside space-y-2 pl-4">
                      <li>il diritto di revocare il consenso in qualsiasi momento, qualora il trattamento si basi sul suo consenso;</li>
                      <li>(qualora applicabile) il diritto alla portabilità dei dati (diritto di ricevere tutti i dati personali che lo riguardano in un formato strutturato, di uso comune e leggibile da dispositivo automatico);</li>
                      <li>il diritto di opporsi:
                        <ul className="list-disc list-inside pl-6 mt-2 space-y-1">
                          <li>in tutto o in parte, per motivi legittimi al trattamento dei dati personali che lo riguarda, ancorché pertinenti allo scopo della raccolta;</li>
                          <li>in tutto o in parte, al trattamento di dati personali che lo riguarda a fini di invio di materiale pubblicitario o di vendita diretta o per il compimento di ricerche di mercato o di comunicazione commerciale;</li>
                          <li>qualora i dati personali siano trattati per finalità di marketing diretto, in qualsiasi momento, al trattamento dei dati effettuato per tale finalità, compresa la profilazione nella misura in cui sia connessa a tale marketing diretto.</li>
                        </ul>
                      </li>
                      <li>qualora ritenesse che il trattamento che lo riguarda violi il Regolamento, il diritto di proporre reclamo a un'Autorità di controllo (nello Stato membro in cui risiede abitualmente, in quello in cui lavora oppure in quello in cui si è verificata la presunta violazione). L'Autorità di controllo italiana è il Garante per la protezione dei dati personali, con sede in Piazza Venezia, n. 11, 00187 – Roma (RM) (<a href="http://www.garanteprivacy.it/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">http://www.garanteprivacy.it/</a>).</li>
                    </ul>
                    <p className="italic mt-4">
                      Il Titolare non è responsabile per l'aggiornamento di tutti i link visualizzabili nella presente Informativa, pertanto ogni qualvolta un link non sia funzionante e/o aggiornato, l'Utente riconosce ed accetta che dovrà sempre far riferimento al documento e/o sezione dei siti internet richiamati da tale link.
                    </p>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="terms" className="space-y-6 mt-6 text-sm max-h-[600px] overflow-y-auto">
                <div className="space-y-4">
                  <h2 className="text-2xl font-bold">Termini e Condizioni di Servizio</h2>
                  
                  <div className="space-y-3">
                    <h3 className="text-lg font-semibold">Introduzione</h3>
                    <p>
                      LoveableConnect è una piattaforma di socializzazione e incontri online che consente agli utenti di creare profili, interagire e comunicare tra loro. L'utilizzo del sito implica l'accettazione integrale dei presenti Termini e Condizioni.
                    </p>
                  </div>

                  <div className="space-y-3">
                    <h3 className="text-lg font-semibold">1. OGGETTO e DEFINIZIONI</h3>
                    <p>
                      <strong>1.1</strong> Le presenti condizioni generali di contratto (di seguito, le "CONDIZIONI GENERALI") contengono i termini e le condizioni che regolano la fornitura del Servizio LoveableConnect (di seguito anche solo il "Servizio") disponibile sul sito https://loveableconnect.com/ e sull'applicazione "LoveableConnect" (di seguito, il "Sito/App"). Le CONDIZIONI GENERALI sono stipulate tra Lei, quale Utente finale dei servizi (di seguito, "Lei" o l'"Utente") Le presenti CONDIZIONI GENERALI disciplinano e regolano il Servizio fornito dalla Società all'Utente per mezzo del Sito/App, annullano qualsiasi disposizione precedente tra le Parti non espressamente citata o allegata e costituiscono l'insieme dei diritti e degli obblighi tra la Società e l'Utente. Il Sito/App si propone di facilitare la comunicazione tra gli Utenti al fine di agevolare la nascita di nuove amicizie.
                    </p>
                    <p><strong>1.2</strong> In aggiunta ai termini ed alle parole definiti altrove nelle CONDIZIONI GENERALI, ai fini delle medesime si definiscono:</p>
                    <ul className="list-disc list-inside space-y-2 pl-4">
                      <li><strong>"Abbonamento"</strong> il periodo di sottoscrizione dei Servizi a pagamento;</li>
                      <li><strong>"Applicazione"</strong> l'applicazione LoveableConnect, disponibile sulle piattaforme App Store di Apple e Play Store di Google scaricabile gratuitamente.</li>
                      
                      <li><strong>"Cause di Forza Maggiore"</strong> a titolo esemplificativo e senza alcun intento limitativo, si considerano cause di forza maggiore ai sensi e per gli effetti delle CONDIZIONI GENERALI: serrate, scioperi, mancanza assoluta di mezzi di trasporto, guerra, rivolta o altre azioni militari, inondazioni, incendi, fulmini, esplosioni, incidenti, interruzioni dell'energia elettrica, interruzioni, malfunzionamenti o sovraccarichi delle linee telefoniche o telematiche, ritardi o inadempimenti da parte dei terzi fornitori di LoveableConnect o qualsiasi altro evento che esuli dalla ragionevole sfera di controllo di LoveableConnect e che impedisca il pieno e corretto adempimento delle obbligazioni previste dalle CONDIZIONI GENERALI in capo alla stessa;</li>
                      <li><strong>"Contenuti"</strong> ogni informazione, dato, video, immagine, foto, testo, descrizione, indicazione, dettaglio personale, interesse, hobby, presentazione forniti dall'Utente e caricati sul Sito/App;</li>
                      <li><strong>"Data di Efficacia"</strong> si considera la data di accettazione delle presenti CONDIZIONI GENERALI da parte dell'Utente</li>
                      
                      <li><strong>"Profilo"</strong> pagina web personale e privata dell'Utente sul Sito/App, collegata all'account creato in fase di iscrizione al Sito/App;</li>
                      
                    </ul>
                  </div>

                  <div className="space-y-3">
                    <h3 className="text-lg font-semibold">2. REQUISITI PER L'UTILIZZO</h3>
                    <p>
                      L'accesso è consentito esclusivamente a utenti di età pari o superiore a 18 anni.
                      L'utente è responsabile della veridicità delle informazioni fornite al momento della registrazione.
                    </p>
                  </div>

                  <div className="space-y-3">
                    <h3 className="text-lg font-semibold">3. CONTENUTI CARICATI DAGLI UTENTI</h3>
                    <p>
                      Gli utenti possono caricare immagini e descrizioni sul proprio profilo. 
                      All'interno possono essere presenti immagini personali, profili che includono nudità o di natura sensuale, purché non contengano nudità esplicita, atti sessuali, contenuti offensivi, discriminatori o violenti. 
                      LoveableConnect si riserva il diritto di rimuovere o oscurare contenuti che violino queste regole o la legge vigente.
                    </p>
                  </div>

                  <div className="space-y-3">
                    <h3 className="text-lg font-semibold">4. CREDITI E ABBONAMENTI</h3>
                    <p>
                      LoveableConnect utilizza un sistema di crediti virtuali per accedere a funzionalità aggiuntive, come l'invio di messaggi, invio dei Like, sblocco della chat, messaggi vocali con altri utenti o l'interazione avanzata con altri profili.
                    </p>
                    <p className="font-semibold mt-3">Abbonamento mensile:</p>
                    <p>
                      Include crediti illimitati, possibilità di inviare messaggi senza limitazioni, mettere like illimitati, vedere i like ricevuti, messaggi vocali, e sblocco della chat diretto con altri utenti.
                    </p>
                    <p className="font-semibold mt-3">Pacchetti e abbonamenti:</p>
                    <p>
                      L'acquisto di crediti o di un abbonamento consente di accedere a funzionalità extra, come l'invio di messaggi a utenti con cui non si è ancora fatto match e la possibilità di interagire più liberamente con i profili presenti sulla piattaforma.
                    </p>
                    <p>
                      I crediti si consumano quando si utilizzano le funzionalità premium e si rinnovano secondo le modalità dell'abbonamento o del pacchetto acquistato.
                      Tutti i pagamenti sono gestiti tramite sistemi di pagamento sicuri. Non sono previsti rimborsi una volta che i crediti sono stati utilizzati.
                      LoveableConnect si riserva il diritto di modificare le offerte, i pacchetti o le modalità di abbonamento, informando gli utenti in anticipo.
                    </p>
                  </div>

                  <div className="space-y-3">
                    <h3 className="text-lg font-semibold">4.1 Regalo abbonamenti</h3>
                    <p>
                      LoveableConnect offre la possibilità agli utenti di regalare un abbonamento mensile ad altri utenti tramite l'apposita icona "Regala".
                      Il pagamento dell'abbonamento è a carico dell'utente che effettua il regalo ("mittente"), mentre il beneficio viene assegnato automaticamente all'account destinatario selezionato.
                    </p>
                    <p className="font-semibold mt-3">L'acquisto di un abbonamento come regalo:</p>
                    <ul className="list-disc list-inside space-y-2 pl-4">
                      <li>è vincolante e non rimborsabile, anche se il destinatario non utilizza il servizio o rifiuta il regalo;</li>
                      <li>comporta la registrazione delle informazioni relative all'operazione (ID utente mittente, destinatario, data e importo);</li>
                      <li>non può essere revocato una volta completato il pagamento;</li>
                      <li>in caso di profilo admin o speciale, il pagamento segue comunque le regole standard di transazione.</li>
                    </ul>
                    <p className="mt-3">
                      LoveableConnect si riserva il diritto di annullare o sospendere i regali in caso di frode, abusi o violazioni dei Termini di Servizio.
                    </p>
                  </div>

                  <div className="space-y-3">
                    <h3 className="text-lg font-semibold">5. LIMITAZIONI DI RESPONSABILITÀ</h3>
                    <p>
                      LoveableConnect non garantisce che i profili siano autentici o che gli utenti rispondano ai messaggi.
                      Il sito non è responsabile per eventuali comportamenti impropri, truffe o danni causati da altri utenti.
                      Gli utenti sono invitati a mantenere prudenza e rispetto durante le interazioni.
                    </p>
                    <p className="mt-3">
                      LoveableConnect adotta sistemi di verifica automatica e controlli periodici per preservare la community da profili falsi o sospetti. 
                      Gli utenti hanno il dovere di segnalare al servizio di supporto clienti qualsiasi comportamento anomalo o sospetto, o se ritengono che un profilo sia falso.
                    </p>
                    <p>
                      Il team di supporto clienti si impegna a indagare immediatamente sulle segnalazioni ricevute, analizzando l'attività e i contenuti dell'account segnalato.
                    </p>
                    <p className="font-semibold mt-3">Attenzione alle segnalazioni improprie:</p>
                    <p>
                      Si invita tuttavia a non abusare della funzione di segnalazione: non devono essere segnalati profili per motivi personali, rifiuti o mancata corrispondenza di interesse.
                      Le segnalazioni infondate o diffamatorie possono comportare la sospensione dell'account segnalante, poiché la diffamazione è un reato perseguibile per legge.
                    </p>
                  </div>

                  <div className="space-y-3">
                    <h3 className="text-lg font-semibold">6. SOSPENSIONE E CANCELLAZIONE ACCOUNT</h3>
                    <p>
                      LoveableConnect si riserva il diritto di sospendere o eliminare profili che violino i presenti Termini, senza preavviso e senza rimborso di crediti o abbonamenti.
                    </p>
                  </div>

                  <div className="space-y-3">
                    <h3 className="text-lg font-semibold">7. MESSAGGI VOCALI IN CHAT</h3>
                    <p className="font-semibold">Funzionalità</p>
                    <p>
                      Gli utenti abbonati a Premium possono inviare i messaggi vocali all'interno delle chat con altri utenti.
                      Questa funzione è disponibile solo per gli utenti con abbonamento mensile Premium attivo.
                      Gli utenti non abbonati non potranno inviare messaggi vocali, ma potranno riceverli se il mittente ha un abbonamento attivo.
                    </p>
                    <p className="font-semibold mt-3">Condizioni d'uso</p>
                    <p>
                      L'utente è responsabile dei contenuti vocali inviati. Non sono consentiti messaggi che contengano contenuti illegali, offensivi, diffamatori o sessualmente espliciti non appropriati al contesto della piattaforma.
                      LoveableConnect si riserva il diritto di moderare o rimuovere messaggi vocali che violino i termini.
                      Gli utenti devono rispettare la privacy altrui: non è consentito registrare o condividere conversazioni senza il consenso dei partecipanti.
                    </p>
                    <p className="font-semibold mt-3">Limitazioni</p>
                    <p>
                      L'abbonamento Premium deve essere attivo per poter usare la funzione.
                      Eventuali violazioni delle regole possono comportare la sospensione temporanea o permanente dell'accesso alla funzione vocale e, nei casi gravi, dell'account.
                    </p>
                  </div>

                  <div className="space-y-3">
                    <h3 className="text-lg font-semibold">8. MINIGAME E CLASSIFICA</h3>
                    <p className="font-semibold">Funzionamento dei minigame</p>
                    <p>
                      All'interno del sito LoveableConnect sono disponibili minigame come Tris e Dama. Partecipando a queste sfide, gli utenti possono guadagnare crediti e punti ELO.
                    </p>
                    <ul className="list-disc list-inside space-y-2 pl-4">
                      <li><strong>Vittoria:</strong> +6 crediti e +20 punti ELO</li>
                      <li><strong>Pareggio:</strong> nessuna variazione</li>
                      <li><strong>Sconfitta:</strong> perdita di 10 punti ELO</li>
                    </ul>
                    <p className="font-semibold mt-3">Classifica ELO</p>
                    <p>
                      Il sistema tiene traccia dei punti ELO di tutti gli utenti. Solo i Top 5 giocatori con punteggio più alto vengono mostrati pubblicamente nella classifica. Gli utenti presenti nella classifica lo diventano automaticamente in base alle loro performance nei minigame.
                    </p>
                    <p className="font-semibold mt-3">Regole di gioco</p>
                    <p>
                      Tutti gli utenti devono rispettare le regole dei minigame e non possono utilizzare mezzi illeciti, bot o trucchi per manipolare i risultati. LoveableConnect si riserva il diritto di intervenire in caso di comportamenti scorretti, inclusa la rimozione dei punti o dei crediti guadagnati in modo fraudolento.
                    </p>
                  </div>

                  <div className="space-y-3">
                    <h3 className="text-lg font-semibold">9. ⚖️ DICHIARAZIONE DI RESPONSABILITÀ</h3>
                    <p>LoveableConnect non si assume responsabilità per:</p>
                    <ul className="list-disc list-inside space-y-2 pl-4">
                      <li>comportamenti o contenuti pubblicati dagli utenti;</li>
                      <li>uso improprio dei servizi o violazioni dei termini;</li>
                      <li>danni derivanti da interazioni online o offline con altri membri.</li>
                    </ul>
                    <p className="mt-3">
                      L'utente è pienamente responsabile delle informazioni che decide di rendere pubbliche e dei propri comportamenti sulla piattaforma.
                    </p>
                  </div>

                  <div className="space-y-3">
                    <h3 className="text-lg font-semibold">10. CONCLUSIONE DEL CONTRATTO</h3>
                    <p>
                      La informiamo che premendo il pulsante "Iscriviti" in fase di registrazione del Sito/App o, comunque, utilizzando il Servizio, Lei dichiara di aver letto ed espressamente accetta le presenti CONDIZIONI GENERALI. La registrazione a LoveableConnect e l'utilizzo del Servizio (fatto salvo che per i servizi disponibili esclusivamente a pagamento, i quali richiedono la sottoscrizione di un Abbonamento o un pagamento On-Demand) sono completamente gratuiti (salvi i costi per le apparecchiature – computer, applicazioni e mezzi di telecomunicazione – e i costi di connessione alla rete Internet, che sono a carico dell'Utente sulla base delle condizioni economiche stabilite dal proprio operatore).
                    </p>
                    <p>
                      Qualora non intenda accettare anche uno soltanto dei termini e delle condizioni delle presenti CONDIZIONI GENERALI, La invitiamo cortesemente a non utilizzare il Servizio e ad abbandonare il Sito/App. Lei prende atto ed accetta che i Servizi di cui Lei fruisce sul Sito/App sono per mettere in contatto gli Utenti e che LoveableConnect fornisce una mera piattaforma di contatto. La Società, pertanto, non è e non sarà parte ovvero responsabile dei singoli contatti tra Utenti, nonché dei relativi contenuti.
                    </p>
                  </div>

                  <div className="space-y-3">
                    <h3 className="text-lg font-semibold">11. I SERVIZI DI LOVEABLECONNECT</h3>
                    <p>
                      <strong>3.1</strong> L'Utente nel completare il Profilo in fase di registrazione, inserisce il Territorio, il genere (Maschile/Femmine/altro) di Utenti che sta cercando, il nickname con cui apparirà sul Sito/App, indica la propria età e poi convalida il proprio Profilo tramite la ricezione di una e-mail e relativa conferma.
                    </p>
                    <p>
                      L'Utente per usufruire dei Servizi deve disporre di applicazioni e aver effettuato impostazioni necessarie al corretto funzionamento del Servizio, quali a titolo di esempio e non esaustivo:
                    </p>
                    <ul className="list-disc list-inside pl-4">
                      <li>browser IE10 o superiore</li>
                      <li>attivazione delle funzioni JavaScript</li>
                      <li>ricevimento dei cookie di sessione e accettazione della visualizzazione delle finestre a comparsa</li>
                      <li>per fruizione da App su iPhone versione iOS11 o superiore, su Android versione 5.0 o superiore</li>
                    </ul>
                    
                    <p className="font-semibold mt-4">
                      LoveableConnect è una piattaforma di intrattenimento sociale che offre esperienze interattive e conversazioni virtuali.
                      Gli utenti possono interagire con profili e personaggi progettati per offrire un'esperienza piacevole, stimolante e di svago.
                      Il servizio è pensato per momenti di divertimento e compagnia, non come mezzo per garantire incontri reali.
                    </p>
                    <p className="italic">
                      L'utente riconosce che alcune interazioni, messaggi o profili presenti su LoveableConnect possono essere gestiti da operatori, moderatori o sistemi automatizzati per finalità di intrattenimento. LoveableConnect non assicura che ogni profilo rappresenti una persona reale, né che le interazioni conducano a relazioni o incontri fuori dalla piattaforma. L'uso del servizio implica l'accettazione di tale modalità di funzionamento.
                    </p>

                    <h4 className="font-semibold mt-4">3.8 Diritto di recesso</h4>
                    <p>
                      Ai sensi del Codice del Consumo, l'Utente dichiara espressamente ed accetta di non poter usufruire del diritto di recesso in ottemperanza a quanto previsto all'art. 59 che recita: "Il diritto di recesso di cui agli articoli da 52 a 58 per i contratti a distanza e i contratti negoziati fuori dei locali commerciali è escluso relativamente a [...] o) la fornitura di contenuto digitale mediante un supporto non materiale se l'esecuzione è iniziata con l'accordo espresso del consumatore e con la sua accettazione del fatto che in tal caso avrebbe perso il diritto di recesso".
                    </p>
                  </div>

                  <div className="space-y-3">
                    <h3 className="text-lg font-semibold">11. DICHIARAZIONI E GARANZIE DELL'UTENTE</h3>
                    <p>L'Utente dichiara e garantisce:</p>
                    <ul className="list-disc list-inside space-y-2 pl-4">
                      <li>di aver letto e compreso le CONDIZIONI GENERALI;</li>
                      <li>di essere maggiorenne, di avere la capacità di agire e sottoscrivere contratti legalmente vincolanti;</li>
                      <li>di aver, in fase di iscrizione, scelto una password sicura e complessa;</li>
                      <li>che caricherà sul proprio Profilo solo informazioni e Contenuti che ha il diritto di condividere e che il Profilo sarà veritiero;</li>
                      <li>che non caricherà sul Sito/App alcuna informazione personale che possa consentire ad altri Utenti di contattarlo con altri mezzi diversi dai Servizi;</li>
                      <li>che non pubblicherà o utilizzerà dati falsi, o volti all'incitazione all'odio, di stampo omofobico, violenti nei confronti di qualsiasi minoranza;</li>
                      <li>che si asterrà dall'immettere nel Sito/App qualsiasi contenuto osceno, offensivo, violento, diffamatorio, lesivo della dignità personale;</li>
                    </ul>
                  </div>

                  <div className="space-y-3">
                    <h3 className="text-lg font-semibold">12. RESPONSABILITÀ</h3>
                    <p><strong>5.1</strong> L'Utente riconosce ed espressamente accetta che:</p>
                    <ul className="list-disc list-inside space-y-2 pl-4">
                      <li>il Sito/App mette in contatto gli Utenti e permette loro di conoscersi e la Società non agisce in alcun modo in relazione ai Servizi a disposizione sul Sito/App;</li>
                      <li>gli Utenti riconoscono espressamente ed accettano che la Società possa avvalersi di soggetti e assistenti di profilo con i quali non è possibile effettuare incontri reali, affinché seguano e intrattengano gli Utenti in modo da garantire un'esperienza utente ottimale;</li>
                      <li>la Società non conduce alcun tipo di controllo o verifica dei precedenti penali dei propri Utenti;</li>
                      <li>gli Utenti sono le uniche parti in relazione ai Servizi e la Società è totalmente estranea ai singoli rapporti tra gli Utenti;</li>
                    </ul>
                    
                    <p className="mt-4">
                      <strong>5.2</strong> Fatto salvo il caso di dolo o colpa grave, nella massima misura consentita dalla legge, l'Utente riconosce ed accetta che la Società non sarà in alcun modo responsabile verso l'Utente per eventuali danni, perdite, costi, oneri e spese, diretti o indiretti, subiti e/o sopportati dall'Utente in connessione con il Servizio.
                    </p>
                  </div>

                  <div className="space-y-3">
                    <h3 className="text-lg font-semibold">13. PRIVACY</h3>
                    <p>
                      La Società rispetta e tutela la privacy dei propri Utenti. La Società tratta i dati personali dell'Utente esclusivamente con le modalità e per le finalità indicate nell'Informativa Privacy. In particolare, la Società non tratterà i dati dell'Utente con finalità di marketing e/o invio di comunicazioni commerciali e/o vendita diretta senza avere ottenuto il suo previo espresso consenso.
                    </p>
                  </div>

                  <div className="space-y-3">
                    <h3 className="text-lg font-semibold">14. CESSIONE</h3>
                    <p>
                      L'Utente non potrà cedere né in tutto né in parte le presenti CONDIZIONI GENERALI a terzi. La Società potrà in qualsiasi momento cedere in tutto in parte le presenti CONDIZIONI GENERALI a terzi.
                    </p>
                  </div>

                  <div className="space-y-3">
                    <h3 className="text-lg font-semibold">15. DURATA e SOPRAVVIVENZA DI CLAUSOLE</h3>
                    <p>
                      <strong>8.1</strong> Le presenti CONDIZIONI GENERALI hanno efficacia a partire dalla Data di Efficacia, rimarranno in vigore per il periodo di 1 (uno) anno da tale data e saranno automaticamente rinnovate per periodi successivi di un anno ciascuno, salvo che una Parte comunichi all'altra Parte a mezzo di raccomandata a/r la sua intenzione di non rinnovare le CONDIZIONI GENERALI almeno 30 (trenta) giorni dalla scadenza di ciascun rinnovo.
                    </p>
                    <p>
                      <strong>8.2</strong> Le seguenti clausole delle CONDIZIONI GENERALI resteranno valide ed efficaci anche dopo la conclusione delle presenti CONDIZIONI GENERALI: art. 4 (Dichiarazioni e Garanzie dell'Utente); art. 5 (Responsabilità); art. 11 (Legge Applicabile e Foro Competente); art. 13 (Clausole Generali).
                    </p>
                  </div>

                  <div className="space-y-3">
                    <h3 className="text-lg font-semibold">16. RECESSO</h3>
                    <p>
                      Fatto salvo quanto previsto all'articolo 3.8, ciascuna Parte potrà recedere dalle presenti CONDIZIONI GENERALI in qualsiasi momento, tramite semplice comunicazione scritta all'altra Parte con preavviso di almeno 5 (cinque) giorni. Resta inteso che, anche in caso di recesso, La Società si riserva il diritto di cancellare o sospendere il Profilo dell'Utente.
                    </p>
                    <p>
                      In caso di recesso da parte dell'Utente nessun rimborso potrà essere chiesto per le somme già corrisposte.
                    </p>
                  </div>

                  <div className="space-y-3">
                    <h3 className="text-lg font-semibold">17. RISOLUZIONE</h3>
                    <p>
                      Fatto salvo quanto previsto altrove all'interno delle presenti CONDIZIONI GENERALI, in caso di violazione degli articoli 3.2, 3.3, 3.5, 4 e 7 delle presenti CONDIZIONI GENERALI da parte dell'Utente, ai sensi dell'art. 1456 cod. civ., la Società si riserva il diritto di sospenderne il Profilo dell'Utente e, se del caso, di risolvere di diritto le CONDIZIONI GENERALI, a fronte della semplice comunicazione (via e-mail o in-app) di volersi avvalere della presente clausola.
                    </p>
                    <p>
                      Questa risoluzione sarà a pieno titolo, fatto salvo il diritto della Società di agire contro l'Utente o suoi danti causa per ottenere il risarcimento di eventuali danni subiti in conseguenza dell'uso improprio del Servizio. I dati relativi all'Utente verranno cancellati immediatamente dietro sua espressa richiesta o in ogni caso dalla Società entro il termine previsto dalla normativa applicabile e necessario ai fini della tutela degli interessi della Società e/o degli altri Utenti.
                    </p>
                  </div>

                  <div className="space-y-3">
                    <h3 className="text-lg font-semibold">18. LEGGE APPLICABILE E FORO COMPETENTE</h3>
                    <p>
                      <strong>11.1</strong> Le presenti CONDIZIONI GENERALI sono interamente disciplinate dalla legge italiana.
                    </p>
                    <p>
                      <strong>11.2</strong> Fermo restando quanto stabilito a tutela dei consumatori in materia di foro competente, qualsiasi controversia sorgesse tra le Parti in relazione alla validità, interpretazione, esecuzione e risoluzione delle presenti CONDIZIONI GENERALI e/o comunque in connessione con le presenti CONDIZIONI GENERALI sarà di esclusiva competenza del Foro di Milano, con esclusione di ogni altro, anche concorrente o alternativo.
                    </p>
                  </div>

                  <div className="space-y-3">
                    <h3 className="text-lg font-semibold">19. MODIFICHE AI TERMINI</h3>
                    <p>
                      I presenti Termini possono essere aggiornati in qualsiasi momento. Gli utenti verranno informati in caso di modifiche sostanziali.
                    </p>
                    <p className="mt-3">
                      La Società si riserva il diritto di aggiornare o modificare in qualsiasi momento le presenti CONDIZIONI GENERALI, nel caso in cui tali aggiornamento o modifiche si rendano necessari per adeguare il Servizio a disposizioni di legge o di regolamento o delle policy o condizioni App Store e Play Store sopravvenute, per implementare misure di sicurezza che si rendano necessarie per ottimizzare la fornitura del Servizio o per migliorare le caratteristiche del Servizio.
                    </p>
                    <p>
                      La Società informerà delle modifiche sopravvenute direttamente sul Sito/App. Le modifiche alle CONDIZIONI GENERALI saranno automaticamente valide ed efficaci a partire dal decimo giorno dalla data di pubblicazione sul Sito/App e si intenderanno accettate dall'Utente. L'Utente riconosce ed accetta che sarà proprio onere controllare periodicamente la pagina del Sito/App che riporta le CONDIZIONI GENERALI al fine di verificare la presenza di eventuali aggiornamenti.
                    </p>
                    <p>
                      In caso di modifiche alle presenti CONDIZIONI GENERALI, l'Utente avrà comunque diritto di recesso, che potrà esercitare in qualsiasi momento attraverso semplice comunicazione scritta alla Società o chiudendo direttamente il proprio account sul Sito/App tramite la propria area personale.
                    </p>
                  </div>

                  <div className="space-y-3">
                    <h3 className="text-lg font-semibold">20. CLAUSOLE GENERALI</h3>
                    <p>
                      <strong>13.1</strong> L'eventuale tolleranza da parte della Società verso comportamenti dell'Utente posti in essere in violazione di una qualunque disposizione delle CONDIZIONI GENERALI non costituisce rinuncia ai diritti derivanti dalla disposizione violata, né al diritto di esigere il corretto adempimento di tutte le disposizioni delle CONDIZIONI GENERALI stesse.
                    </p>
                    <p>
                      <strong>13.2</strong> Il mancato o ritardato esercizio di un diritto spettante a LoveableConnect ai sensi delle CONDIZIONI GENERALI non comporta rinuncia allo stesso.
                    </p>
                    <p>
                      <strong>13.3</strong> Le CONDIZIONI GENERALI contengono l'accordo complessivamente raggiunto dalle Parti rispetto all'oggetto delle stesse ed esse prevalgono su tutte le precedenti comunicazioni, dichiarazioni, nonché le intese e gli accordi, sia orali che scritti, raggiunti dalle Parti.
                    </p>
                    <p>
                      <strong>13.4</strong> Qualora qualsiasi termine o altra disposizione delle presenti CONDIZIONI GENERALI fosse dichiarato nullo, annullabile o inapplicabile, tutte le altre condizioni e disposizioni delle presenti CONDIZIONI GENERALI rimarranno, comunque, pienamente valide ed efficaci. Nel caso in cui vi sia l'annullamento o la nullità di qualche termine o disposizione poiché invalido, contrario a norme imperative od inapplicabile, le Parti si impegnano a negoziare in buona fede per modificare le presenti CONDIZIONI GENERALI in modo tale da realizzare nel miglior modo possibile l'originale intenzione delle Parti al fine di adempiere nel miglior modo possibile gli impegni ivi previsti.
                    </p>
                    <p>
                      <strong>13.5</strong> LoveableConnect e gli Utenti agiscono in piena autonomia ed indipendenza. Le presenti CONDIZIONI GENERALI non fanno sorgere tra loro alcun rapporto di collaborazione, agenzia, associazione, intermediazione o lavoro subordinato.
                    </p>
                    <p>
                      <strong>13.6</strong> Qualunque comunicazione da una Parte all'altra ai sensi delle CONDIZIONI GENERALI dovrà essere inviata o mezzo lettera raccomandata al seguente indirizzo Iumob Srl, Via Comelico, 3, 20135 Milano (purché con l'opzione di notifica di ricevimento) o tramite il form contatti del customer care.
                    </p>
                  </div>

                  <div className="space-y-3">
                    <h3 className="text-lg font-semibold">21. CLAUSOLE VESSATORIE</h3>
                    <p>
                      L'Utente riconosce ed accetta che alcuni paragrafi delle CONDIZIONI GENERALI contengono alcune previsioni vessatorie, tra cui i punti di seguito elencati e che pertanto, dovrà accettarle espressamente in sede di iscrizione, ai sensi degli articoli 1341 e 1342 del Codice Civile:
                    </p>
                    <p>
                      2. Conclusione Del Contratto; 3. I Servizi di LoveableConnect (in particolare, 3.2, 3.3, 3.4, 3.5, 3.6, 3.11, 3.12, 3.13 e 3.14); 4. Dichiarazioni e Garanzie dell'utente; 5. Responsabilità; 8. Durata e Sopravvivenza di Clausole; 9. Recesso; 10. Risoluzione; 11. Legge Applicabile e Foro Competente; 12. Modifiche.
                    </p>
                    <p className="italic">
                      L'Utente è invitato a leggere attentamente le predette clausole prima di concludere la Registrazione sul Sito/download della App, rinunciando a qualsivoglia pretesa in merito alle stesse, anche a titolo di rimborso o risarcitorio.
                    </p>
                  </div>

                  <div className="space-y-3">
                    <h3 className="text-lg font-semibold">22. SICUREZZA E PRIVACY</h3>
                    
                    <h4 className="font-semibold mt-4">Pensi che il tuo account sia stato compromesso?</h4>
                    <p>
                      Se noti attività sospette sul tuo account, come messaggi che non hai inviato o foto che non hai caricato, ci sono alcune cose che puoi fare per assicurarti che il tuo account sia sicuro.
                    </p>
                    
                    <p className="font-semibold">Accesso tramite Login con E-mail e Password</p>
                    <p>
                      Per mantenere il tuo account al sicuro, ti consigliamo vivamente di non condividere mai questi le credenziali di accesso con nessuno in caso tu ritenga che il tuo account sia stato compromesso contattaci subito.
                    </p>
                    
                    <h4 className="font-semibold mt-4">Vuoi segnalare un disservizio o una vulnerabilità del Sito/App?</h4>
                    <p>
                      Per qualsiasi tipo di segnalazione relativa a possibili disservizi/malfunzionamenti e vulnerabilità del Sito/App puoi contattare il nostro customer care.
                    </p>
                    <p>
                      Per qualsiasi tipo di segnalazione relativa alla vulnerabilità e alla protezione dei tuoi dati puoi fare riferimento alla nostra Privacy Policy o contattarci immediatamente.
                    </p>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="cookies" className="space-y-6 mt-6 text-sm max-h-[600px] overflow-y-auto">
                <div className="space-y-4">
                  <h2 className="text-2xl font-bold">Cookie Policy di LoveableConnect</h2>
                  <p className="text-sm text-muted-foreground">Ultimo aggiornamento: 15/10/2025</p>
                  
                  <p>
                    Questa Cookie Policy ha lo scopo di spiegarti quali cookie e strumenti simili (tracciatori) utilizziamo, a quali fini, come puoi gestirli e come esercitare i tuoi diritti in merito.
                  </p>

                  <div className="space-y-3">
                    <h3 className="text-lg font-semibold">1. Cosa sono i cookie</h3>
                    <p>
                      I cookie sono piccoli file di testo che un sito invia al browser del tuo dispositivo, dove vengono memorizzati per essere poi ritrasmessi allo stesso sito alla tua visita successiva. Esistono cookie "propri" (o di prima parte), impostati direttamente dal Sito, e cookie di "terze parti", impostati da domini esterni per funzioni aggiuntive (es. analisi, pubblicità, social).
                    </p>
                    <p>I cookie possono essere:</p>
                    <ul className="list-disc list-inside pl-4 space-y-1">
                      <li><strong>di sessione:</strong> eliminati alla chiusura del browser;</li>
                      <li><strong>persistenti:</strong> restano nel dispositivo per un periodo prestabilito.</li>
                    </ul>
                  </div>

                  <div className="space-y-3">
                    <h3 className="text-lg font-semibold">2. Cookie e tecnologie di memorizzazione utilizzati da LoveableConnect</h3>
                    <p>LoveableConnect utilizza le seguenti tecnologie di memorizzazione e cookie:</p>
                    
                    <div className="space-y-4 mt-4">
                      <div className="border border-border p-4 rounded-lg">
                        <h4 className="font-semibold text-base mb-2">A. Cookie Tecnici Necessari (non richiedono consenso)</h4>
                        
                        <div className="mt-3 space-y-3">
                          <div>
                            <p className="font-medium">Cookie di autenticazione Supabase</p>
                            <p className="text-sm text-muted-foreground mt-1">
                              <strong>Nome:</strong> sb-access-token, sb-refresh-token<br />
                              <strong>Finalità:</strong> Gestione dell'autenticazione utente e mantenimento della sessione di login<br />
                              <strong>Durata:</strong> Sessione / persistente fino al logout<br />
                              <strong>Tipologia:</strong> Cookie tecnico di prima parte
                            </p>
                          </div>

                          <div>
                            <p className="font-medium">Cookie di consenso cookie</p>
                            <p className="text-sm text-muted-foreground mt-1">
                              <strong>Nome:</strong> cookie-consent<br />
                              <strong>Finalità:</strong> Memorizza le preferenze dell'utente riguardo l'uso dei cookie<br />
                              <strong>Durata:</strong> 12 mesi<br />
                              <strong>Tipologia:</strong> Cookie tecnico di prima parte
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="border border-border p-4 rounded-lg">
                        <h4 className="font-semibold text-base mb-2">B. Memorizzazione Locale (localStorage)</h4>
                        
                        <div className="mt-3 space-y-3">
                          <div>
                            <p className="font-medium">Preferenze tema</p>
                            <p className="text-sm text-muted-foreground mt-1">
                              <strong>Nome:</strong> theme<br />
                              <strong>Finalità:</strong> Memorizza la preferenza del tema (chiaro/scuro)<br />
                              <strong>Durata:</strong> Permanente fino alla cancellazione manuale<br />
                              <strong>Tipologia:</strong> Memorizzazione locale
                            </p>
                          </div>

                          <div>
                            <p className="font-medium">Preferenze lingua</p>
                            <p className="text-sm text-muted-foreground mt-1">
                              <strong>Nome:</strong> i18nextLng<br />
                              <strong>Finalità:</strong> Memorizza la lingua selezionata dall'utente (italiano, inglese, tedesco, spagnolo, francese, arabo)<br />
                              <strong>Durata:</strong> Permanente fino alla cancellazione manuale<br />
                              <strong>Tipologia:</strong> Memorizzazione locale
                            </p>
                          </div>

                          <div>
                            <p className="font-medium">Dati cache applicazione</p>
                            <p className="text-sm text-muted-foreground mt-1">
                              <strong>Nome:</strong> Vari (react-query cache, profili visualizzati)<br />
                              <strong>Finalità:</strong> Migliorare le prestazioni dell'applicazione memorizzando temporaneamente dati già caricati<br />
                              <strong>Durata:</strong> Sessione / temporaneo<br />
                              <strong>Tipologia:</strong> Memorizzazione locale
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="border border-border p-4 rounded-lg">
                        <h4 className="font-semibold text-base mb-2">C. Service Worker e Notifiche Push</h4>
                        
                        <div className="mt-3">
                          <p className="font-medium">Service Worker</p>
                          <p className="text-sm text-muted-foreground mt-1">
                            <strong>Nome:</strong> sw.js<br />
                            <strong>Finalità:</strong> Gestione delle notifiche push e funzionalità offline dell'applicazione<br />
                            <strong>Durata:</strong> Fino alla disinstallazione manuale<br />
                            <strong>Tipologia:</strong> Tecnologia web necessaria per le notifiche push
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h3 className="text-lg font-semibold">3. Cookie di terze parti</h3>
                    <p className="font-semibold">LoveableConnect attualmente NON utilizza:</p>
                    <ul className="list-disc list-inside pl-4 space-y-1 text-muted-foreground">
                      <li>Cookie di profilazione pubblicitaria</li>
                      <li>Cookie di tracking analytics di terze parti (Google Analytics, Facebook Pixel, ecc.)</li>
                      <li>Cookie di social media per tracciamento comportamentale</li>
                    </ul>
                    <p className="mt-3 text-sm">
                      Nel caso in cui decidessimo di integrare servizi di terze parti che utilizzano cookie, aggiorneremo questa policy e richiederemo il tuo consenso esplicito.
                    </p>
                  </div>

                  <div className="space-y-3">
                    <h3 className="text-lg font-semibold">4. Gestione del consenso</h3>
                    <p>
                      Al primo accesso al Sito comparirà un banner che ti informa dell'uso dei cookie. I cookie tecnici necessari (autenticazione, sessione) sono indispensabili per il funzionamento del servizio e non richiedono il tuo consenso esplicito.
                    </p>
                    <p>
                      Le tue scelte riguardo eventuali cookie opzionali saranno memorizzate tramite un cookie tecnico che ricorda la preferenza.
                    </p>
                    <p>
                      Puoi gestire le tue preferenze sui cookie anche attraverso le impostazioni del tuo browser.
                    </p>
                  </div>

                  <div className="space-y-3">
                    <h3 className="text-lg font-semibold">5. Effetti della disattivazione</h3>
                    <ul className="list-disc list-inside pl-4 space-y-2">
                      <li><strong>Cookie di autenticazione:</strong> Se disattivati o cancellati, verrai disconnesso automaticamente e dovrai effettuare nuovamente il login. Il sito non funzionerà correttamente senza questi cookie.</li>
                      <li><strong>localStorage (tema e lingua):</strong> Se cancellati, le tue preferenze di visualizzazione torneranno ai valori predefiniti.</li>
                      <li><strong>Service Worker:</strong> Se disattivato, non riceverai notifiche push per nuovi messaggi o match.</li>
                    </ul>
                    <p className="mt-3 text-sm font-semibold">
                      Attenzione: disattivare i cookie necessari renderà impossibile l'utilizzo di LoveableConnect.
                    </p>
                  </div>

                  <div className="space-y-3">
                    <h3 className="text-lg font-semibold">6. Durata della memorizzazione</h3>
                    <ul className="list-disc list-inside pl-4 space-y-2">
                      <li><strong>Cookie di sessione:</strong> Validi fino alla chiusura del browser o logout</li>
                      <li><strong>Cookie persistenti:</strong> Fino a 12 mesi o fino alla cancellazione manuale</li>
                      <li><strong>localStorage:</strong> Permanente fino alla cancellazione manuale da parte dell'utente o dall'applicazione</li>
                      <li><strong>Service Worker:</strong> Permanente fino alla disinstallazione o cancellazione dati del browser</li>
                    </ul>
                  </div>

                  <div className="space-y-3">
                    <h3 className="text-lg font-semibold">7. Come gestire i cookie dal browser</h3>
                    <p>Puoi gestire o eliminare i cookie attraverso le impostazioni del tuo browser:</p>
                    <ul className="list-disc list-inside pl-4 space-y-1 text-sm">
                      <li><strong>Chrome:</strong> Impostazioni → Privacy e sicurezza → Cookie e altri dati dei siti</li>
                      <li><strong>Firefox:</strong> Opzioni → Privacy e sicurezza → Cookie e dati dei siti web</li>
                      <li><strong>Safari:</strong> Preferenze → Privacy → Gestisci dati siti web</li>
                      <li><strong>Edge:</strong> Impostazioni → Cookie e autorizzazioni sito → Cookie e dati dei siti</li>
                    </ul>
                    <p className="mt-3 text-sm text-muted-foreground">
                      Nota: la cancellazione dei cookie tecnici ti disconnetterà da LoveableConnect e resetterà le tue preferenze.
                    </p>
                  </div>

                  <div className="space-y-3">
                    <h3 className="text-lg font-semibold">8. Diritti dell'utente e contatti</h3>
                    <p>Hai il diritto di:</p>
                    <ul className="list-disc list-inside pl-4 space-y-2">
                      <li>richiedere informazioni dettagliate su quali cookie e tecnologie utilizziamo;</li>
                      <li>cancellare cookie e dati di memorizzazione locale dal tuo browser;</li>
                      <li>disattivare le notifiche push dalle impostazioni del browser;</li>
                      <li>esercitare tutti i diritti relativi alla privacy previsti dal GDPR (accesso, rettifica, cancellazione, portabilità dei dati personali).</li>
                    </ul>
                    <p className="mt-4">
                      Per qualsiasi domanda riguardo questa Cookie Policy o per esercitare i tuoi diritti, contattaci a: <a href="mailto:loveableconnect@hotmail.com" className="text-primary hover:underline font-medium">loveableconnect@hotmail.com</a>
                    </p>
                  </div>

                  <div className="mt-6 p-4 bg-muted rounded-lg">
                    <p className="text-sm">
                      <strong>Ultimo aggiornamento:</strong> Gennaio 2025<br />
                      LoveableConnect si riserva il diritto di modificare questa Cookie Policy in qualsiasi momento. Le modifiche saranno pubblicate su questa pagina con data di aggiornamento.
                    </p>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>;
};
export default TermsAndConditions;