import React, { useState } from 'react';
import { Copy, Check, Share2, ChevronDown, Download, FileText, FileType, Printer } from 'lucide-react';
import { nativeShare } from '@/lib/nativeShare';
import { getPublicOrigin } from '@/lib/publicOrigin';
import { printHtml } from '@/lib/printHelpers';
import { triggerDownload } from '@/lib/nativeDownload';
import { isNativeAndroid } from '@/lib/isNativeAndroid';
import { toast } from 'sonner';
import { jsPDF } from 'jspdf';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

const VIDEOS = [
  { title: 'La Importancia de la Sangre', id: 'Vpn00jurClA' },
  { title: 'Doctrina de la Expiación de Sangre', id: 'rW7cF6T8LSs' },
  { title: 'El Evangelio Sin Sangre', id: '6ZCvPnYxn0A' },
];

function buildSpanishGospelText() {
  const origin = getPublicOrigin();
  return `¡El Evangelio es 1 Corintios 15:1-4!
El Evangelio de Salvación

Fuente: laiglesiadelanube.com — Roberto Breaker

Muchas sectas cristianas modernas erróneamente enseñan que la salvación viene por medio de algo que el pecador HACE. Ellos afirman que la salvación de una persona es dependiente sobre las obras del pecador. ¡Pero nada podría ser más lejos de la verdad de la palabra de Dios! Según la Biblia, la salvación es algo que recibimos (por fe) en lo que Jesús HIZO en la cruz del Calvario, porque allí ÉL derramó su sangre para pagar por los pecados de todos los seres humanos. SU OBRA TERMINADA, hecha una sola vez para todos, es la única cosa que puede salvar al pecador y darle perdón de sus pecados y vida eterna.

La Biblia claramente presenta el Evangelio en 1 Corintios 15:1-4, donde leemos:

"1 Empero os declaro, hermanos, el evangelio que os he predicado, el cual también recibisteis, y en el cual estáis firmes; 2 Por el cual asimismo, si retenéis la palabra que os he predicado, sois salvos, si no creísteis en vano. 3 Porque primeramente os he enseñado lo que asimismo yo recibí, que Cristo murió por nuestros pecados, según las Escrituras; 4 Y que fue sepultado, y que resucitó al tercer día, según las Escrituras;"

Hay que entender que el evangelio es: ¡lo que JESÚS HABÍA HECHO PARA LOS HOMBRES, y no lo que EL HOMBRE PUEDE HACER PARA DIOS! Una persona solamente está salva por medio de CREER en la obra cumplida de JesuCristo, cuando él derramó su sangre preciosa para nuestros pecados. La expiación de sangre era necesaria, porque sin derramamiento de sangre, no hay remisión (según Hebreos 9:22). Dios siempre ha demandado la sangre para el pecado. En el Antiguo Testamento, Dios aceptó la sangre de un cordero. Pero ahora, en el Nuevo Testamento, Dios sólo acepta el sacrificio de la sangre derramada de JesuCristo, el CORDERO DE DIOS, lo cual padeció por tus pecados.

El Evangelio de 1 Corintios 15:1-4 tiene cinco partes:
1. Cristo murió  2. Por nuestros pecados  3. Fue Sepultado  4. Resucitó al tercer día  5. Según las Escrituras.

¡Un predicador antiguo dijo una vez: "NADIE PUEDE PREDICAR EL EVANGELIO SIN PREDICAR LA EXPIACIÓN DE SANGRE DE CRISTO Y TAMPOCO PUEDE ALGUIEN PREDICAR DE LA EXPIACIÓN DE SANGRE DE CRISTO SIN PREDICAR EL EVANGELIO!"

¡Esta es una verdad bíblica absoluta! Ya que la salvación por el sacrificio de sangre derramada de JesuCristo en la cruz es el único camino en que Dios nos ofrece vida eterna.

Punto #1 Cristo murió. Jesús derramó cada gota de su sangre preciosa mientras que sufrió en la cruz del Calvario, muriendo por los pecados del hombre. Y su sangre manchó la tierra.

Punto #2 Por nuestros pecados. La biblia dice que el pecado es como sangre, en Isaías 1:18 leemos:
"Venid luego, dirá el SEÑOR, y estemos a cuenta: si vuestros pecados fueren como la grana, como la nieve serán emblanquecidos: si fueren rojos como el carmesí, vendrán a ser como blanca lana."
Grana (o escarlata) y carmesí son el color de sangre.

Punto #3 Fue sepultado. Le enterraron al Señor JesuCristo en la misma tierra en la cual él derramó su sangre. Cuando murió Abel, leemos las siguientes palabras en Génesis 4:10 en lo cual Dios dijo:
"… La voz de la sangre de tu hermano clama a mí desde la tierra."
Según la biblia ¡sangre habla a Dios! Y Hebreos 12:24 nos cuenta de la sangre preciosa de Jesús:
"Y a Jesús el mediador del nuevo pacto; Y a la sangre de la rociadura que habla cosas mejores que la de Abel."
¡La sangre de Jesús también habla! ¿Qué dice? ¡Dice que el inocente (Jesús) murió para los culpables (nosotros pecadores)!

Punto #4 Resucitó. Cuando Jesús resucitó de los muertos, la biblia nos dice que Jesús tomó su sangre al cielo con él y lo roció en el altar en el cielo (Heb. 9:12-25), ¡dónde está todavía esperando a lavar al más vil pecador! ¿Eres limpio en la sangre?

Punto #5 Según las Escrituras. El Antiguo Testamento entero profetiza de JesuCristo como el Mesías que había de venir. Le miramos otra vez y otra vez en tipo cada vez que los judíos sacrificaron animales en el templo para expiación de sangre. Cuando Jesús murió en la cruz como el Cordero de Dios, derramando su sangre como nuestro sacrificio, él cumplió la profecía escrita de él a través del Antiguo Testamento. Entonces, ¡allí miramos que la SANGRE DE JESUCRISTO está hallada en todo el evangelio, y toda la biblia!

¡No puedes predicar la sangre sin predicar el evangelio y no puedes predicar el evangelio sin predicar de la sangre derramada de Jesús!

Ahora, para ser salvo, la biblia nos enseña claramente que la salvación es por la FE, sin OBRAS (Ef. 2:8-9). ¿Fe en qué? ¡FE EN AQUELLA SANGRE DERRAMADA DE JESUCRISTO! Romanos 3:25-28 aclaran esto:
"Al cual Dios ha propuesto por propiciación POR LA FE EN SU SANGRE, para manifestación de su justicia por la remisión de los pecados pasados, por la paciencia de Dios; 26 Para manifestación de su justicia en este tiempo; para que él sea justo, y justificador del que cree en Jesús. 27 ¿Dónde, pues, está la jactancia? Excluída queda. ¿Por cuál ley? ¿De las obras? No: sino por la ley de la fe. 28 Así que, concluimos ser el hombre justificado por fe sin las obras de la ley."

Para ser justificado, o salvado, la fe del pecador debe ser puesta solamente en la sangre derramada de Cristo Jesús. Esto manifiesta o declara que el pecador está confiando en EL JUSTO (Jesús) y SU JUSTICIA y no en sus propias obras y su propia justicia. ¡Un creyente no puede jactarse de sí mismo y sus propias obras, sino en Jesús quién le salvó de sus pecados!

Tristemente, en nuestra edad moderna de apostasía, hay muy pocos cristianos que predican de la sangre de Jesús, y la necesidad de confiar en ella para obtener la salvación. ¡Pero la verdad bíblica simple es, NI ERES CRISTIANO HASTA QUE CONFÍAS EN LA SANGRE DERRAMADA DE CRISTO JESÚS!

Lee el Evangelio completo:
${origin}/espanol-evangelio

🎬 Mis Videos Sobre la Sangre de Cristo:
${VIDEOS.map((v) => `${v.title}\nhttps://youtu.be/${v.id}`).join('\n\n')}`;
}

export default function SpanishGospelActions() {
  const [copied, setCopied] = useState(false);
  const [shared, setShared] = useState(false);

  const handleCopy = async () => {
    const text = buildSpanishGospelText();
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    const text = buildSpanishGospelText();
    if (nativeShare({ title: 'El Evangelio de Salvación', text })) return;
    try {
      if (navigator.share) {
        await navigator.share({ title: 'El Evangelio de Salvación', text });
        return;
      }
    } catch (err) {
      if (err?.name === 'AbortError') return;
    }
    try {
      await navigator.clipboard.writeText(text);
      setShared(true);
      setTimeout(() => setShared(false), 2000);
    } catch {}
  };

  const handleDownloadTxt = () => {
    triggerDownload(new Blob([buildSpanishGospelText()], { type: 'text/plain;charset=utf-8' }), 'el-evangelio.txt')
      .then(() => toast.success(isNativeAndroid() ? '¡Guardado en tu carpeta de Descargas!' : '¡Archivo descargado correctamente!'))
      .catch((err) => { console.error('Download failed:', err); toast.error('Error al descargar. Inténtalo de nuevo.'); });
  };

  const handleDownloadPdf = () => {
    const text = buildSpanishGospelText()
      .replace(/[\u2018\u2019]/g, "'")
      .replace(/[\u201C\u201D]/g, '"')
      .replace(/[\u2013\u2014]/g, '-')
      .replace(/[\u2026]/g, '...');
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    const margin = 48;
    const maxWidth = doc.internal.pageSize.getWidth() - margin * 2;
    const pageHeight = doc.internal.pageSize.getHeight();
    doc.setFont('times', 'normal');
    doc.setFontSize(11);
    const lines = doc.splitTextToSize(text, maxWidth);
    let y = margin;
    lines.forEach((line) => {
      if (y > pageHeight - margin) { doc.addPage(); y = margin; }
      doc.text(line, margin, y);
      y += 16;
    });
    triggerDownload(doc.output('blob'), 'el-evangelio.pdf')
      .then(() => toast.success(isNativeAndroid() ? '¡Guardado en tu carpeta de Descargas!' : '¡Archivo descargado correctamente!'))
      .catch((err) => { console.error('Download failed:', err); toast.error('Error al descargar. Inténtalo de nuevo.'); });
  };

  const handleDownloadWord = () => {
    const text = buildSpanishGospelText();
    const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const body = text.split('\n').map((line) => {
      const trimmed = line.trim();
      if (!trimmed) return '<p style="margin:0;line-height:1.4">&nbsp;</p>';
      return `<p style="margin:0;line-height:1.4">${esc(line)}</p>`;
    }).join('');
    const html = `<!DOCTYPE html><html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="utf-8"><title>El Evangelio</title></head><body style="font-family:Georgia,serif;font-size:12pt;color:#000">${body}</body></html>`;
    triggerDownload(new Blob(['\ufeff', html], { type: 'application/msword' }), 'el-evangelio.doc')
      .then(() => toast.success(isNativeAndroid() ? '¡Guardado en tu carpeta de Descargas!' : '¡Archivo descargado correctamente!'))
      .catch((err) => { console.error('Download failed:', err); toast.error('Error al descargar. Inténtalo de nuevo.'); });
  };

  const handlePrint = () => {
    const text = buildSpanishGospelText();
    const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    // Skip the first two lines (title + "El Evangelio de Salvación" subtitle)
    // -- they're already rendered below as the styled <h1>/<p> header. Without
    // this, buildSpanishGospelText()'s own copy of those same two lines
    // printed AGAIN right underneath, as plain unstyled text -- a duplicate
    // of the title on the printed page. Everything else, including the
    // "Fuente: laiglesiadelanube.com — Roberto Breaker" credit line right
    // after, is kept exactly as before.
    const bodyHtml = text.split('\n').slice(2).map((line) => {
      const trimmed = line.trim();
      if (!trimmed) return '<p style="margin:0 0 8pt 0;">&nbsp;</p>';
      return `<p style="margin:0 0 8pt 0;line-height:1.5;font-size:12pt;">${esc(line)}</p>`;
    }).join('');
    const header = `<h1 style="font-family:Georgia,serif;font-size:22pt;text-align:center;margin-bottom:6pt;">¡El Evangelio es 1 Corintios 15:1-4!</h1><p style="text-align:center;font-size:11pt;color:#555;margin-bottom:24pt;">El Evangelio de Salvación</p>`;
    printHtml(header + bodyHtml);
  };

  return (
    <div className="flex flex-wrap items-center justify-center gap-2">
      <button
        onClick={handleCopy}
        className="inline-flex items-center gap-2 px-4 py-2 bg-secondary border border-border hover:bg-accent/20 text-foreground rounded-lg font-sans text-sm font-medium transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
      >
        {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
        {copied ? '¡Copiado!' : 'Copiar Texto'}
      </button>
      <div className="inline-flex items-stretch bg-secondary border border-border rounded-lg overflow-hidden">
        <button
          onClick={handleShare}
          className="flex items-center gap-2 px-4 py-2 hover:bg-accent/20 text-foreground font-sans text-sm font-medium transition-colors"
        >
          {shared ? <Check className="w-4 h-4 text-green-600" /> : <Share2 className="w-4 h-4" />}
          {shared ? '¡Copiado!' : 'Compartir'}
        </button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center justify-center px-3 hover:bg-accent/20 text-foreground transition-colors outline-none border-l border-border/50">
              <ChevronDown className="w-4 h-4 opacity-70" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="font-sans w-56">
            <DropdownMenuItem onClick={handleDownloadTxt} className="gap-2 cursor-pointer py-2.5">
              <Download className="w-4 h-4 text-muted-foreground flex-shrink-0" /> Descargar como Texto
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleDownloadPdf} className="gap-2 cursor-pointer py-2.5">
              <FileText className="w-4 h-4 text-muted-foreground flex-shrink-0" /> Descargar como PDF
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleDownloadWord} className="gap-2 cursor-pointer py-2.5">
              <FileType className="w-4 h-4 text-muted-foreground flex-shrink-0" /> Descargar como Word
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handlePrint} className="gap-2 cursor-pointer py-2.5">
              <Printer className="w-4 h-4 text-muted-foreground flex-shrink-0" /> Imprimir
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}