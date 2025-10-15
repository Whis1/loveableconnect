import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft } from "lucide-react";
import { useLanguageDetection } from "@/hooks/useLanguageDetection";

const TermsAndConditions = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  useLanguageDetection();

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50 dark:from-gray-900 dark:to-gray-800 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="mb-4"
        >
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

              <TabsContent value="privacy" className="space-y-6 mt-6 text-sm">
                <div className="space-y-4">
                  <h2 className="text-2xl font-bold">INFORMATIVA PRIVACY CONTATTI</h2>
                  
                  <div className="space-y-3">
                    <h3 className="text-lg font-semibold">COME CONTATTARCI?</h3>
                    <p>
                      Il Titolare tiene nella massima considerazione il diritto alla privacy e alla protezione dei dati personali dei propri Utenti.
                      Per ogni informazione in relazione alla presente informativa privacy, gli Utenti possono contattare il Titolare in qualsiasi momento, utilizzando le seguenti modalità.
                    </p>
                    <p className="font-medium">
                      Direttamente online:<br />
                      Tramite Posta: <a href="mailto:lovablecon@hotmail.it" className="text-primary hover:underline">lovablecon@hotmail.it</a>
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
                      <strong>Direttamente online:</strong><br />
                      Contattando il servizio clienti tramite l'apposito form Contatti
                    </p>
                    <p>
                      <strong>Tramite Posta:</strong><br />
                      Gli Utenti possono anche contattare il Responsabile della protezione dei dati (RPD o DPO) del Titolare, i cui dati di contatto sono di seguito riportati: e-mail <a href="mailto:lovableconnect@hotmail.it" className="text-primary hover:underline">lovableconnect@hotmail.it</a>
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
                    <h3 className="text-lg font-semibold">1. OGGETTO e DEFINIZIONI</h3>
                    <p>
                      <strong>1.1</strong> Le presenti condizioni generali di contratto (di seguito, le "CONDIZIONI GENERALI") contengono i termini e le condizioni che regolano la fornitura del Servizio LovableConnect (di seguito anche solo il "Servizio") disponibile sul sito https://lovableconneect.lovable.app e sull'applicazione "LovableConnect" (di seguito, il "Sito/App"). Le CONDIZIONI GENERALI sono stipulate tra Lei, quale Utente finale dei servizi (di seguito, "Lei" o l'"Utente") Le presenti CONDIZIONI GENERALI disciplinano e regolano il Servizio fornito dalla Società all'Utente per mezzo del Sito/App, annullano qualsiasi disposizione precedente tra le Parti non espressamente citata o allegata e costituiscono l'insieme dei diritti e degli obblighi tra la Società e l'Utente. Il Sito/App si propone di facilitare la comunicazione tra gli Utenti al fine di agevolare la nascita di nuove amicizie.
                    </p>
                    <p><strong>1.2</strong> In aggiunta ai termini ed alle parole definiti altrove nelle CONDIZIONI GENERALI, ai fini delle medesime si definiscono:</p>
                    <ul className="list-disc list-inside space-y-2 pl-4">
                      <li><strong>"Abbonamento"</strong> il periodo di sottoscrizione dei Servizi a pagamento;</li>
                      <li><strong>"Applicazione"</strong> l'applicazione LovableConnect, disponibile sulle piattaforme App Store di Apple e Play Store di Google scaricabile gratuitamente.</li>
                      <li><strong>"Canoni"</strong> le tipologie di pacchetti e/o abbonamenti disponibili sul Sito/App, con le modalità descritte nell'articolo 3.2 e seguenti;</li>
                      <li><strong>"Cause di Forza Maggiore"</strong> a titolo esemplificativo e senza alcun intento limitativo, si considerano cause di forza maggiore ai sensi e per gli effetti delle CONDIZIONI GENERALI: serrate, scioperi, mancanza assoluta di mezzi di trasporto, guerra, rivolta o altre azioni militari, inondazioni, incendi, fulmini, esplosioni, incidenti, interruzioni dell'energia elettrica, interruzioni, malfunzionamenti o sovraccarichi delle linee telefoniche o telematiche, ritardi o inadempimenti da parte dei terzi fornitori di LovableConnect o qualsiasi altro evento che esuli dalla ragionevole sfera di controllo di LovableConnect e che impedisca il pieno e corretto adempimento delle obbligazioni previste dalle CONDIZIONI GENERALI in capo alla stessa;</li>
                      <li><strong>"Contenuti"</strong> ogni informazione, dato, video, immagine, foto, testo, descrizione, indicazione, dettaglio personale, interesse, hobby, presentazione forniti dall'Utente e caricati sul Sito/App;</li>
                      <li><strong>"Data di Efficacia"</strong> si considera la data di accettazione delle presenti CONDIZIONI GENERALI da parte dell'Utente</li>
                      <li><strong>"Durata del Contratto"</strong> la durata delle presenti CONDIZIONI GENERALI, come indicata al successivo articolo 8;</li>
                      <li><strong>"Profilo"</strong> pagina web personale e privata dell'Utente sul Sito/App, collegata all'account creato in fase di iscrizione al Sito/App;</li>
                      <li><strong>"Servizi"</strong> i servizi a disposizione dell'Utente presenti sul Sito/App, come specificato al seguente articolo 3 delle presenti CONDIZIONI GENERALI;</li>
                    </ul>
                  </div>

                  <div className="space-y-3">
                    <h3 className="text-lg font-semibold">2. CONCLUSIONE DEL CONTRATTO</h3>
                    <p>
                      La informiamo che premendo il pulsante "Iscriviti" in fase di registrazione del Sito/App o, comunque, utilizzando il Servizio, Lei dichiara di aver letto ed espressamente accetta le presenti CONDIZIONI GENERALI. La registrazione a LovableConnect e l'utilizzo del Servizio (fatto salvo che per i servizi disponibili esclusivamente a pagamento, i quali richiedono la sottoscrizione di un Abbonamento o un pagamento On-Demand) sono completamente gratuiti (salvi i costi per le apparecchiature – computer, applicazioni e mezzi di telecomunicazione – e i costi di connessione alla rete Internet, che sono a carico dell'Utente sulla base delle condizioni economiche stabilite dal proprio operatore).
                    </p>
                    <p>
                      Qualora non intenda accettare anche uno soltanto dei termini e delle condizioni delle presenti CONDIZIONI GENERALI, La invitiamo cortesemente a non utilizzare il Servizio e ad abbandonare il Sito/App. Lei prende atto ed accetta che i Servizi di cui Lei fruisce sul Sito/App sono per mettere in contatto gli Utenti e che LovableConnect fornisce una mera piattaforma di contatto. La Società, pertanto, non è e non sarà parte ovvero responsabile dei singoli contatti tra Utenti, nonché dei relativi contenuti.
                    </p>
                  </div>

                  <div className="space-y-3">
                    <h3 className="text-lg font-semibold">3. I SERVIZI DI LOVABLECONNECT</h3>
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
                      LovableConnect è una piattaforma di intrattenimento sociale che offre esperienze interattive e conversazioni virtuali.
                      Gli utenti possono interagire con profili e personaggi progettati per offrire un'esperienza piacevole, stimolante e di svago.
                      Il servizio è pensato per momenti di divertimento e compagnia, non come mezzo per garantire incontri reali.
                    </p>
                    <p className="italic">
                      L'utente riconosce che alcune interazioni, messaggi o profili presenti su LovableConnect possono essere gestiti da operatori, moderatori o sistemi automatizzati per finalità di intrattenimento. LovableConnect non assicura che ogni profilo rappresenti una persona reale, né che le interazioni conducano a relazioni o incontri fuori dalla piattaforma. L'uso del servizio implica l'accettazione di tale modalità di funzionamento.
                    </p>

                    <h4 className="font-semibold mt-4">3.8 Diritto di recesso</h4>
                    <p>
                      Ai sensi del Codice del Consumo, l'Utente dichiara espressamente ed accetta di non poter usufruire del diritto di recesso in ottemperanza a quanto previsto all'art. 59 che recita: "Il diritto di recesso di cui agli articoli da 52 a 58 per i contratti a distanza e i contratti negoziati fuori dei locali commerciali è escluso relativamente a [...] o) la fornitura di contenuto digitale mediante un supporto non materiale se l'esecuzione è iniziata con l'accordo espresso del consumatore e con la sua accettazione del fatto che in tal caso avrebbe perso il diritto di recesso".
                    </p>
                  </div>

                  <div className="space-y-3">
                    <h3 className="text-lg font-semibold">4. DICHIARAZIONI E GARANZIE DELL'UTENTE</h3>
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
                    <h3 className="text-lg font-semibold">5. RESPONSABILITÀ</h3>
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
                    <h3 className="text-lg font-semibold">6. PRIVACY</h3>
                    <p>
                      La Società rispetta e tutela la privacy dei propri Utenti. La Società tratta i dati personali dell'Utente esclusivamente con le modalità e per le finalità indicate nell'Informativa Privacy. In particolare, la Società non tratterà i dati dell'Utente con finalità di marketing e/o invio di comunicazioni commerciali e/o vendita diretta senza avere ottenuto il suo previo espresso consenso.
                    </p>
                  </div>

                  <div className="space-y-3">
                    <h3 className="text-lg font-semibold">7. CESSIONE</h3>
                    <p>
                      L'Utente non potrà cedere né in tutto né in parte le presenti CONDIZIONI GENERALI a terzi. La Società potrà in qualsiasi momento cedere in tutto in parte le presenti CONDIZIONI GENERALI a terzi.
                    </p>
                  </div>

                  <div className="space-y-3">
                    <h3 className="text-lg font-semibold">8. DURATA e SOPRAVVIVENZA DI CLAUSOLE</h3>
                    <p>
                      <strong>8.1</strong> Le presenti CONDIZIONI GENERALI hanno efficacia a partire dalla Data di Efficacia, rimarranno in vigore per il periodo di 1 (uno) anno da tale data e saranno automaticamente rinnovate per periodi successivi di un anno ciascuno, salvo che una Parte comunichi all'altra Parte a mezzo di raccomandata a/r la sua intenzione di non rinnovare le CONDIZIONI GENERALI almeno 30 (trenta) giorni dalla scadenza di ciascun rinnovo.
                    </p>
                    <p>
                      <strong>8.2</strong> Le seguenti clausole delle CONDIZIONI GENERALI resteranno valide ed efficaci anche dopo la conclusione delle presenti CONDIZIONI GENERALI: art. 4 (Dichiarazioni e Garanzie dell'Utente); art. 5 (Responsabilità); art. 11 (Legge Applicabile e Foro Competente); art. 13 (Clausole Generali).
                    </p>
                  </div>

                  <div className="space-y-3">
                    <h3 className="text-lg font-semibold">9. RECESSO</h3>
                    <p>
                      Fatto salvo quanto previsto all'articolo 3.8, ciascuna Parte potrà recedere dalle presenti CONDIZIONI GENERALI in qualsiasi momento, tramite semplice comunicazione scritta all'altra Parte con preavviso di almeno 5 (cinque) giorni. Resta inteso che, anche in caso di recesso, La Società si riserva il diritto di cancellare o sospendere il Profilo dell'Utente.
                    </p>
                    <p>
                      In caso di recesso da parte dell'Utente nessun rimborso potrà essere chiesto per le somme già corrisposte.
                    </p>
                  </div>

                  <div className="space-y-3">
                    <h3 className="text-lg font-semibold">10. RISOLUZIONE</h3>
                    <p>
                      Fatto salvo quanto previsto altrove all'interno delle presenti CONDIZIONI GENERALI, in caso di violazione degli articoli 3.2, 3.3, 3.5, 4 e 7 delle presenti CONDIZIONI GENERALI da parte dell'Utente, ai sensi dell'art. 1456 cod. civ., la Società si riserva il diritto di sospenderne il Profilo dell'Utente e, se del caso, di risolvere di diritto le CONDIZIONI GENERALI, a fronte della semplice comunicazione (via e-mail o in-app) di volersi avvalere della presente clausola.
                    </p>
                    <p>
                      Questa risoluzione sarà a pieno titolo, fatto salvo il diritto della Società di agire contro l'Utente o suoi danti causa per ottenere il risarcimento di eventuali danni subiti in conseguenza dell'uso improprio del Servizio. I dati relativi all'Utente verranno cancellati immediatamente dietro sua espressa richiesta o in ogni caso dalla Società entro il termine previsto dalla normativa applicabile e necessario ai fini della tutela degli interessi della Società e/o degli altri Utenti.
                    </p>
                  </div>

                  <div className="space-y-3">
                    <h3 className="text-lg font-semibold">11. LEGGE APPLICABILE E FORO COMPETENTE</h3>
                    <p>
                      <strong>11.1</strong> Le presenti CONDIZIONI GENERALI sono interamente disciplinate dalla legge italiana.
                    </p>
                    <p>
                      <strong>11.2</strong> Fermo restando quanto stabilito a tutela dei consumatori in materia di foro competente, qualsiasi controversia sorgesse tra le Parti in relazione alla validità, interpretazione, esecuzione e risoluzione delle presenti CONDIZIONI GENERALI e/o comunque in connessione con le presenti CONDIZIONI GENERALI sarà di esclusiva competenza del Foro di Milano, con esclusione di ogni altro, anche concorrente o alternativo.
                    </p>
                  </div>

                  <div className="space-y-3">
                    <h3 className="text-lg font-semibold">12. MODIFICHE</h3>
                    <p>
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
                    <h3 className="text-lg font-semibold">13. CLAUSOLE GENERALI</h3>
                    <p>
                      <strong>13.1</strong> L'eventuale tolleranza da parte della Società verso comportamenti dell'Utente posti in essere in violazione di una qualunque disposizione delle CONDIZIONI GENERALI non costituisce rinuncia ai diritti derivanti dalla disposizione violata, né al diritto di esigere il corretto adempimento di tutte le disposizioni delle CONDIZIONI GENERALI stesse.
                    </p>
                    <p>
                      <strong>13.2</strong> Il mancato o ritardato esercizio di un diritto spettante a LovableConnect ai sensi delle CONDIZIONI GENERALI non comporta rinuncia allo stesso.
                    </p>
                    <p>
                      <strong>13.3</strong> Le CONDIZIONI GENERALI contengono l'accordo complessivamente raggiunto dalle Parti rispetto all'oggetto delle stesse ed esse prevalgono su tutte le precedenti comunicazioni, dichiarazioni, nonché le intese e gli accordi, sia orali che scritti, raggiunti dalle Parti.
                    </p>
                    <p>
                      <strong>13.4</strong> Qualora qualsiasi termine o altra disposizione delle presenti CONDIZIONI GENERALI fosse dichiarato nullo, annullabile o inapplicabile, tutte le altre condizioni e disposizioni delle presenti CONDIZIONI GENERALI rimarranno, comunque, pienamente valide ed efficaci. Nel caso in cui vi sia l'annullamento o la nullità di qualche termine o disposizione poiché invalido, contrario a norme imperative od inapplicabile, le Parti si impegnano a negoziare in buona fede per modificare le presenti CONDIZIONI GENERALI in modo tale da realizzare nel miglior modo possibile l'originale intenzione delle Parti al fine di adempiere nel miglior modo possibile gli impegni ivi previsti.
                    </p>
                    <p>
                      <strong>13.5</strong> LovableConnect e gli Utenti agiscono in piena autonomia ed indipendenza. Le presenti CONDIZIONI GENERALI non fanno sorgere tra loro alcun rapporto di collaborazione, agenzia, associazione, intermediazione o lavoro subordinato.
                    </p>
                    <p>
                      <strong>13.6</strong> Qualunque comunicazione da una Parte all'altra ai sensi delle CONDIZIONI GENERALI dovrà essere inviata o mezzo lettera raccomandata al seguente indirizzo Iumob Srl, Via Comelico, 3, 20135 Milano (purché con l'opzione di notifica di ricevimento) o tramite il form contatti del customer care.
                    </p>
                  </div>

                  <div className="space-y-3">
                    <h3 className="text-lg font-semibold">14. CLAUSOLE VESSATORIE</h3>
                    <p>
                      L'Utente riconosce ed accetta che alcuni paragrafi delle CONDIZIONI GENERALI contengono alcune previsioni vessatorie, tra cui i punti di seguito elencati e che pertanto, dovrà accettarle espressamente in sede di iscrizione, ai sensi degli articoli 1341 e 1342 del Codice Civile:
                    </p>
                    <p>
                      2. Conclusione Del Contratto; 3. I Servizi di LovableConnect (in particolare, 3.2, 3.3, 3.4, 3.5, 3.6, 3.11, 3.12, 3.13 e 3.14); 4. Dichiarazioni e Garanzie dell'utente; 5. Responsabilità; 8. Durata e Sopravvivenza di Clausole; 9. Recesso; 10. Risoluzione; 11. Legge Applicabile e Foro Competente; 12. Modifiche.
                    </p>
                    <p className="italic">
                      L'Utente è invitato a leggere attentamente le predette clausole prima di concludere la Registrazione sul Sito/download della App, rinunciando a qualsivoglia pretesa in merito alle stesse, anche a titolo di rimborso o risarcitorio.
                    </p>
                  </div>

                  <div className="space-y-3">
                    <h3 className="text-lg font-semibold">15. SICUREZZA E PRIVACY</h3>
                    
                    <h4 className="font-semibold mt-4">Pensi che il tuo account sia stato compromesso?</h4>
                    <p>
                      Se noti attività sospette sul tuo account, come messaggi che non hai inviato o foto che non hai caricato, ci sono alcune cose che puoi fare per assicurarti che il tuo account sia sicuro.
                    </p>
                    
                    <p className="font-semibold">Accesso con Facebook Login</p>
                    <p>
                      Se pensi che qualcuno abbia effettuato un accesso non autorizzato al tuo account Facebook, visita il Centro assistenza di Facebook per un supporto immediato e diretto, oppure contatta il nostro customer care.
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
                  <h2 className="text-2xl font-bold">Cookie Policy di LovableConnect</h2>
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
                    <h3 className="text-lg font-semibold">2. Tipologie di cookie utilizzati</h3>
                    <p>LovableConnect utilizza varie tipologie di cookie, con funzioni differenti:</p>
                    
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse border border-border">
                        <thead>
                          <tr className="bg-muted">
                            <th className="border border-border p-2 text-left">Categoria</th>
                            <th className="border border-border p-2 text-left">Tipologia</th>
                            <th className="border border-border p-2 text-left">Finalità</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td className="border border-border p-2">Cookie tecnici / necessari</td>
                            <td className="border border-border p-2">di prima parte</td>
                            <td className="border border-border p-2">Servono per il funzionamento essenziale del sito: login, navigazione, salvataggio preferenze base (es. lingua), gestione sessioni. Senza questi il sito potrebbe non funzionare correttamente.</td>
                          </tr>
                          <tr>
                            <td className="border border-border p-2">Cookie di preferenza / funzionalità</td>
                            <td className="border border-border p-2">di prima parte</td>
                            <td className="border border-border p-2">Permettono di memorizzare le tue preferenze (es. lingua, tema, visualizzazione schermata) per rendere più facile e comoda la navigazione.</td>
                          </tr>
                          <tr>
                            <td className="border border-border p-2">Cookie analitici / statistiche</td>
                            <td className="border border-border p-2">di terze parti (in alcuni casi)</td>
                            <td className="border border-border p-2">Raccogliere dati aggregati sull'uso del sito: quante persone visitano, quali pagine sono più usate, da dove arrivano gli utenti, ecc. Dati anonimi, non identificativi delle persone.</td>
                          </tr>
                          <tr>
                            <td className="border border-border p-2">Cookie di profilazione / pubblicità</td>
                            <td className="border border-border p-2">di terze parti</td>
                            <td className="border border-border p-2">Utilizzati per mostrarti contenuti o pubblicità che potrebbero interessarti in base al tuo comportamento di navigazione o preferenze. Si attivano solo con il tuo consenso esplicito.</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h3 className="text-lg font-semibold">3. Quali cookie specifici usiamo (esempi)</h3>
                    <p>Esempi di cookie che potrebbero essere presenti (dipende dalle tecnologie che deciderai di usare):</p>
                    <ul className="list-disc list-inside pl-4 space-y-2">
                      <li><strong>"session_id"</strong> — cookie tecnico di sessione per identificarti mentre navighi.</li>
                      <li><strong>"lang_pref"</strong> — cookie preferenza lingua.</li>
                      <li><strong>"analytics_tracker"</strong> — cookie analitico di terze parti (per esempio Google Analytics) per comprendere come usi il sito.</li>
                      <li><strong>"ads_profile"</strong> — cookie di profilazione per personalizzare pubblicità (solo se acconsenti).</li>
                    </ul>
                  </div>

                  <div className="space-y-3">
                    <h3 className="text-lg font-semibold">4. Gestione del consenso</h3>
                    <p>
                      Al primo accesso al Sito comparirà un banner che ti informa dell'uso dei cookie. Potrai accettare tutti i cookie, negare quelli non necessari o gestire le preferenze.
                    </p>
                    <p>
                      Le tue scelte saranno memorizzate tramite un cookie tecnico che ricorda la preferenza.
                    </p>
                    <p>
                      Se cambi idea, puoi modificare le tue preferenze in qualsiasi momento tramite il link "Preferenze Cookie" nel footer del sito.
                    </p>
                  </div>

                  <div className="space-y-3">
                    <h3 className="text-lg font-semibold">5. Effetti della disattivazione</h3>
                    <ul className="list-disc list-inside pl-4 space-y-2">
                      <li>Se disattivi i cookie tecnici, alcune funzionalità potrebbero non funzionare: login, salvataggio preferenze, aree riservate, ecc.</li>
                      <li>Se disattivi cookie analitici o di profilazione, non saranno raccolti dati di quel tipo su di te, ma il sito rimarrà accessibile.</li>
                    </ul>
                  </div>

                  <div className="space-y-3">
                    <h3 className="text-lg font-semibold">6. Durata dei cookie</h3>
                    <p>
                      I cookie tecnici generalmente durano fino alla fine della sessione o per pochi giorni. I cookie persistenti possono restare nel dispositivo per qualche mese o fino al recesso della tua preferenza. I cookie di terze parti seguono le politiche dei rispettivi fornitori.
                    </p>
                  </div>

                  <div className="space-y-3">
                    <h3 className="text-lg font-semibold">7. Cookie di terze parti</h3>
                    <p>Il sito potrebbe includere funzionalità fornite da terzi che usano i propri cookie, ad esempio:</p>
                    <ul className="list-disc list-inside pl-4 space-y-1">
                      <li>strumenti di analisi (es. Google Analytics)</li>
                      <li>social login o pulsanti di condivisione</li>
                      <li>pubblicità esterna (se presente)</li>
                    </ul>
                    <p>
                      Prima di usare queste funzioni, ti consigliamo di leggere le policy privacy / cookie dei terzi; hai sempre il controllo su quali accettare.
                    </p>
                  </div>

                  <div className="space-y-3">
                    <h3 className="text-lg font-semibold">8. Diritti dell'utente</h3>
                    <p>Hai il diritto di:</p>
                    <ul className="list-disc list-inside pl-4 space-y-2">
                      <li>richiedere informazioni su quali cookie usiamo;</li>
                      <li>accettare o rifiutare cookie non necessari;</li>
                      <li>cancellare cookie dal tuo browser;</li>
                      <li>esercitare altri diritti relativi alla privacy (accesso, rettifica, cancellazione dei dati personali) secondo la normativa GDPR (ove applicabile).</li>
                    </ul>
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
