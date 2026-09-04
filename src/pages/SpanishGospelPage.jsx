import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, ExternalLink, PlayCircle, ArrowLeft } from 'lucide-react';
import SpanishGospelActions from '@/components/SpanishGospelActions';

const VIDEOS = [
  { title: 'La Importancia de la Sangre', id: 'Vpn00jurClA' },
  { title: 'Doctrina de la Expiación de Sangre', id: 'rW7cF6T8LSs' },
  { title: 'El Evangelio Sin Sangre', id: '6ZCvPnYxn0A' },
];

function Verse({ children }) {
  return (
    <blockquote className="border-l-4 border-accent/40 pl-4 my-3 font-serif text-foreground/90 italic leading-relaxed">
      {children}
    </blockquote>
  );
}

export default function SpanishGospelPage() {
  const navigate = useNavigate();
  const handleBack = () => {
    if (window.history.state && window.history.state.idx > 0) {
      navigate(-1);
    } else {
      navigate('/espanol');
    }
  };

  return (
    <div
      className="w-full max-w-3xl mx-auto px-5 sm:px-8 lg:px-12 py-10"
      style={{ paddingTop: 'calc(2.5rem + env(safe-area-inset-top))', paddingBottom: 'calc(2.5rem + env(safe-area-inset-bottom))' }}
    >
      <button
        onClick={handleBack}
        className="inline-flex items-center gap-1.5 text-sm font-sans font-medium text-accent hover:underline mb-6"
      >
        <ArrowLeft className="w-4 h-4" /> Volver
      </button>

      <a
        href="https://laiglesiadelanube.com/el-evangelio-de-salvaci%C3%B3n"
        target="_blank"
        rel="noopener noreferrer"
        className="notranslate block text-center font-sans text-xs text-muted-foreground mb-6 hover:text-accent transition-colors"
        translate="no"
      >
        Fuente: laiglesiadelanube.com — Roberto Breaker
      </a>

      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-secondary mb-4">
          <Heart className="w-7 h-7 text-rose-500" />
        </div>
        <h1 className="font-serif text-4xl font-bold text-foreground mb-2">¡El Evangelio es 1 Corintios 15:1-4!</h1>
        <p className="font-sans text-muted-foreground">El Evangelio de Salvación</p>
        <div className="mt-4 w-16 h-px bg-accent mx-auto" />
        <div className="mt-5">
          <SpanishGospelActions />
        </div>
      </div>

      <div className="prose-sm font-sans text-foreground/90 leading-relaxed space-y-4">
        <p>
          Muchas sectas cristianas modernas erróneamente enseñan que la salvación viene por medio de algo que el
          pecador HACE. Ellos afirman que la salvación de una persona es dependiente sobre las <em>obras</em> del
          pecador. ¡Pero nada podría ser más lejos de la verdad de la palabra de Dios! Según la Biblia, la salvación
          es algo que recibimos (por fe) en lo que Jesús HIZO en la cruz del Calvario, porque allí ÉL derramó su
          sangre para pagar por los pecados de todos los seres humanos. SU OBRA TERMINADA, hecha una sola vez para
          todos, es la única cosa que puede salvar al pecador y darle perdón de sus pecados y vida eterna.
        </p>

        <p>La Biblia claramente presenta el Evangelio en 1 Corintios 15:1-4, donde leemos:</p>

        <Verse>
          1 Empero os declaro, hermanos, el evangelio que os he predicado, el cual también recibisteis, y en el cual
          estáis firmes; 2 Por el cual asimismo, si retenéis la palabra que os he predicado, sois salvos, si no
          creísteis en vano. 3 Porque primeramente os he enseñado lo que asimismo yo recibí, que Cristo murió por
          nuestros pecados, según las Escrituras; 4 Y que fue sepultado, y que resucitó al tercer día, según las
          Escrituras;
        </Verse>

        <p>
          Hay que entender que el evangelio es: ¡lo que JESÚS HABÍA HECHO PARA LOS HOMBRES, y no lo que EL HOMBRE
          PUEDE HACER PARA DIOS! Una persona solamente está salva por medio de CREER en la obra cumplida de
          JesuCristo, cuando él derramó su sangre preciosa para nuestros pecados. La expiación de sangre era
          necesaria, porque sin derramamiento de sangre, no hay remisión (según Hebreos 9:22). Dios siempre ha
          demandado la sangre para el pecado. En el Antiguo Testamento, Dios aceptó la sangre de un cordero. Pero
          ahora, en el Nuevo Testamento, Dios sólo acepta el sacrificio de la sangre derramada de JesuCristo, el
          CORDERO DE DIOS, lo cual padeció por tus pecados.
        </p>

        <p>El Evangelio de 1 Corintios 15:1-4 tiene cinco partes:</p>
        <p className="font-semibold">1. Cristo murió &nbsp; 2. Por nuestros pecados &nbsp; 3. Fue Sepultado &nbsp; 4. Resucitó al tercer día &nbsp; 5. Según las Escrituras.</p>

        <p>
          ¡Un predicador antiguo dijo una vez: "NADIE PUEDE PREDICAR EL EVANGELIO SIN PREDICAR LA EXPIACIÓN DE SANGRE
          DE CRISTO Y TAMPOCO PUEDE ALGUIEN PREDICAR DE LA EXPIACIÓN DE SANGRE DE CRISTO SIN PREDICAR EL EVANGELIO!"
        </p>

        <p>
          ¡Esta es una verdad bíblica absoluta! Ya que la salvación por el sacrificio de sangre derramada de
          JesuCristo en la cruz es el único camino en que Dios nos ofrece vida eterna.
        </p>

        <p>
          Como vemos la sangre de Cristo en las cinco heridas que él tenía en la cruz, también anotamos que hay cinco
          puntos del evangelio.
        </p>

        <p>
          <strong>Punto #1 Cristo murió.</strong> Jesús derramó cada gota de su sangre preciosa mientras que sufrió
          en la cruz del Calvario, muriendo por los pecados del hombre. Y su sangre manchó la tierra.
        </p>

        <p>
          <strong>Punto #2 Por nuestros pecados.</strong> La biblia dice que el pecado es como sangre, en Isaías 1:18
          leemos:
        </p>
        <Verse>
          Venid luego, dirá el SEÑOR, y estemos a cuenta: si vuestros pecados fueren como la grana, como la nieve
          serán emblanquecidos: si fueren rojos como el carmesí, vendrán a ser como blanca lana.
        </Verse>
        <p>Grana (o escarlata) y carmesí son el color de sangre.</p>

        <p>
          <strong>Punto #3 Fue sepultado.</strong> Le enterraron al Señor JesuCristo en la misma tierra en la cual él
          derramó su sangre. Cuando murió Abel, leemos las siguientes palabras en Génesis 4:10 en lo cual Dios dijo:
        </p>
        <Verse>… La voz de la sangre de tu hermano clama a mí desde la tierra.</Verse>
        <p>
          Según la biblia ¡sangre habla a Dios! Y Hebreos 12:24 nos cuenta de la sangre preciosa de Jesús:
        </p>
        <Verse>
          Y a Jesús el mediador del nuevo pacto; Y a la sangre de la rociadura que habla cosas mejores que la de
          Abel.
        </Verse>
        <p>¡La sangre de Jesús también habla! ¿Qué dice? ¡Dice que el inocente (Jesús) murió para los culpables (nosotros pecadores)!</p>

        <p>
          <strong>Punto #4 Resucitó.</strong> Cuando Jesús resucitó de los muertos, la biblia nos dice que Jesús tomó
          su sangre al cielo con él y lo roció en el altar en el cielo (Heb. 9:12-25), ¡dónde está todavía esperando a
          lavar al más vil pecador! ¿Eres limpio en la sangre?
        </p>

        <p>
          <strong>Punto #5 Según las Escrituras.</strong> El Antiguo Testamento entero profetiza de JesuCristo como
          el Mesías que había de venir. Le miramos otra vez y otra vez en tipo cada vez que los judíos sacrificaron
          animales en el templo para expiación de sangre. Cuando Jesús murió en la cruz como el Cordero de Dios,
          derramando su sangre como nuestro sacrificio, él cumplió la profecía escrita de él a través del Antiguo
          Testamento. Entonces, ¡allí miramos que la SANGRE DE JESUCRISTO está hallada en todo el evangelio, y toda
          la biblia!
        </p>

        <p>¡No puedes predicar la sangre sin predicar el evangelio y no puedes predicar el evangelio sin predicar de la sangre derramada de Jesús!</p>

        <p>
          Ahora, para ser salvo, la biblia nos enseña claramente que la salvación es por la FE, sin OBRAS (Ef.
          2:8-9). ¿Fe en qué? ¡FE EN AQUELLA SANGRE DERRAMADA DE JESUCRISTO! Romanos 3:25-28 aclaran esto:
        </p>
        <Verse>
          Al cual Dios ha propuesto por propiciación POR LA FE EN SU SANGRE, para manifestación de su justicia por la
          remisión de los pecados pasados, por la paciencia de Dios; 26 Para manifestación de su justicia en este
          tiempo; para que él sea justo, y justificador del que cree en Jesús. 27 ¿Dónde, pues, está la jactancia?
          Excluída queda. ¿Por cuál ley? ¿De las obras? No: sino por la ley de la fe. 28 Así que, concluimos ser el
          hombre justificado por fe sin las obras de la ley.
        </Verse>

        <p>
          Para ser justificado, o salvado, la fe del pecador debe ser puesta solamente en la sangre derramada de
          Cristo Jesús. Esto manifiesta o declara que el pecador está confiando en EL JUSTO (Jesús) y SU JUSTICIA y
          no en sus propias obras y su propia justicia. ¡Un creyente no puede jactarse de sí mismo y sus propias
          obras, sino en Jesús quién le salvó de sus pecados!
        </p>

        <p>
          Tristemente, en nuestra edad moderna de apostasía, hay muy pocos cristianos que predican de la sangre de
          Jesús, y la necesidad de confiar en ella para obtener la salvación. ¡Pero la verdad bíblica simple es, NI
          ERES CRISTIANO HASTA QUE CONFÍAS EN LA SANGRE DERRAMADA DE CRISTO JESÚS!
        </p>
      </div>

      {/* Videos */}
      <div className="mt-10">
        <h2 className="font-serif text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
          <PlayCircle className="w-5 h-5 text-red-500" /> Mis Videos Sobre la Sangre de Cristo
        </h2>
        <div className="space-y-6">
          {VIDEOS.map((v) => (
            <div key={v.id} className="bg-card border border-border rounded-2xl p-4">
              <p className="font-sans text-sm font-medium text-foreground mb-2">{v.title}</p>
              <div className="rounded-xl overflow-hidden border border-border">
                <div className="aspect-video w-full">
                  <iframe
                    src={`https://www.youtube-nocookie.com/embed/${v.id}?rel=0&modestbranding=1&playsinline=1`}
                    title={v.title}
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    referrerPolicy="strict-origin-when-cross-origin"
                    allowFullScreen
                    loading="lazy"
                    className="w-full h-full"
                  />
                </div>
              </div>
              <a
                href={`https://youtu.be/${v.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 mt-3 text-xs font-sans font-medium text-accent hover:underline"
              >
                Ver en YouTube <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}