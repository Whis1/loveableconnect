import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft } from "lucide-react";

const TermsAndConditions = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50 dark:from-gray-900 dark:to-gray-800 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Indietro
        </Button>

        <Card>
          <CardHeader>
            <CardTitle className="text-2xl md:text-3xl text-center">
              Informazioni Legali
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="privacy" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="privacy">Privacy</TabsTrigger>
                <TabsTrigger value="terms">Termini e Condizioni</TabsTrigger>
                <TabsTrigger value="cookies">Cookie</TabsTrigger>
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

              <TabsContent value="terms" className="space-y-4 mt-6">
                <h2 className="text-xl font-semibold">Termini e Condizioni di Servizio</h2>
                <p className="text-muted-foreground">
                  Contenuto dei termini e condizioni di servizio sarà inserito qui.
                </p>
              </TabsContent>

              <TabsContent value="cookies" className="space-y-4 mt-6">
                <h2 className="text-xl font-semibold">Politica sui Cookie</h2>
                <p className="text-muted-foreground">
                  Contenuto della politica sui cookie sarà inserito qui.
                </p>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default TermsAndConditions;
