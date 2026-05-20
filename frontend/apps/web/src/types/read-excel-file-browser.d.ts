declare module "read-excel-file/browser" {
  export function readSheet(file: File): Promise<unknown[][]>;
  export default function readXlsxFile(file: File): Promise<unknown[][]>;
}
