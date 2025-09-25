declare module 'jspdf' {
  interface jsPDF {
    setLineDash(pattern: number[], phase: number): jsPDF;
  }
}
