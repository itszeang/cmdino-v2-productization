export interface DinoOption {
  id: string;
  label: string;
  idlePath: string;
}

export const DINO_OPTIONS: DinoOption[] = [
  {
    id: "female-cole",
    label: "Cole (F)",
    idlePath: "/female/cole/base/idle.png",
  },
  {
    id: "female-kira",
    label: "Kira (F)",
    idlePath: "/female/kira/base/idle.png",
  },
  {
    id: "female-loki",
    label: "Loki (F)",
    idlePath: "/female/loki/base/idle.png",
  },
  {
    id: "male-cole",
    label: "Cole (M)",
    idlePath: "/male/cole/base/idle.png",
  },
  {
    id: "male-kira",
    label: "Kira (M)",
    idlePath: "/male/kira/base/idle.png",
  },
];
