declare module "qrcode.react" {
  import * as React from "react";

  export type QRCodeSVGProps = {
    value: string;
    size?: number;
    level?: "L" | "M" | "Q" | "H";
    includeMargin?: boolean;
    bgColor?: string;
    fgColor?: string;
  };

  export const QRCodeSVG: React.FC<QRCodeSVGProps>;
}
