// pdfjs-dist neposkytuje typy pro workerový bundle; importujeme ho jen kvůli URL.
declare module "pdfjs-dist/build/pdf.worker.min.mjs" {
  const workerSrc: string;
  export default workerSrc;
}
