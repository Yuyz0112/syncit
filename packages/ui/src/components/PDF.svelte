<script>
  import * as PDFJS from 'pdfjs-dist';

  PDFJS.GlobalWorkerOptions.workerSrc =
    '//cdn.jsdelivr.net/npm/pdfjs-dist@2.5.207/build/pdf.worker.min.js';

  let ref;

  const BASE64_MARKER = ';base64,';

  function convertDataURIToBinary(dataURI) {
    const base64Index = dataURI.indexOf(BASE64_MARKER) + BASE64_MARKER.length;
    const base64 = dataURI.substring(base64Index);
    const raw = window.atob(base64);
    const rawLength = raw.length;
    const array = new Uint8Array(new ArrayBuffer(rawLength));

    for (let i = 0; i < rawLength; i++) {
      array[i] = raw.charCodeAt(i);
    }
    return array;
  }

  export function renderPDF({ dataURI }) {
    const task = PDFJS.getDocument(convertDataURIToBinary(dataURI));

    task.promise.then(function (pdf) {
      console.log(pdf);
      for (let i = 1; i <= pdf.numPages; i++) {
        pdf.getPage(i).then(function (page) {
          const scale = 1.5;
          const viewport = page.getViewport({ scale: scale });

          const canvas = document.createElement('canvas');
          ref.appendChild(canvas);
          const context = canvas.getContext('2d');
          canvas.height = viewport.height;
          canvas.width = viewport.width;

          const renderContext = {
            canvasContext: context,
            viewport: viewport,
          };
          page.render(renderContext);
        });
      }
    });
  }
</script>

<style>
  #syncit-pdf {
    position: fixed;
    left: 20px;
    top: 20px;
    right: 20px;
    bottom: 20px;
    overflow: auto;
    display: flex;
    align-items: center;
    flex-direction: column;
  }
</style>

<div id="syncit-pdf" bind:this={ref}>
  <slot />
</div>
