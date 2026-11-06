export interface EventTone {
  bg: string;
  text: string;
  hover: string;
}

export type EventPack = "classic" | "starry";

interface PaletteEntry {
  light: EventTone;
  dark: EventTone;
}

/**
 * Classic: pastel calendar tones in the spirit of macOS Calendar.
 * Starry: candy tones from the cloud-post-office world — warmer, softer, a bit
 * more saturated in hue while keeping labels deep enough to read.
 */
const CLASSIC: PaletteEntry[] = [
  {
    light: { bg: "#FBE3E3", text: "#8B2F2F", hover: "#F5D1D1" },
    dark: { bg: "#4A2A2A", text: "#F2B8B8", hover: "#4A2929" },
  },
  {
    light: { bg: "#FCE7D3", text: "#8A4A1C", hover: "#F6D7BB" },
    dark: { bg: "#4A3524", text: "#EFC29A", hover: "#48331F" },
  },
  {
    light: { bg: "#FAF0C8", text: "#74560F", hover: "#F2E4A6" },
    dark: { bg: "#453C22", text: "#E7D28A", hover: "#443A20" },
  },
  {
    light: { bg: "#DBF0E2", text: "#215B3B", hover: "#C7E5D1" },
    dark: { bg: "#244534", text: "#A9DCBC", hover: "#234232" },
  },
  {
    light: { bg: "#DAEAF7", text: "#1D4C76", hover: "#C3DCEF" },
    dark: { bg: "#22384C", text: "#A9CBE9", hover: "#22384B" },
  },
  {
    light: { bg: "#E7E0F7", text: "#483776", hover: "#D7CCEE" },
    dark: { bg: "#342B4F", text: "#C5B5E9", hover: "#342B4F" },
  },
  {
    light: { bg: "#D6EFEC", text: "#1D5B57", hover: "#BDE3DF" },
    dark: { bg: "#1D3C38", text: "#9FD8D2", hover: "#1C3C38" },
  },
  {
    light: { bg: "#EEE6D8", text: "#5B472A", hover: "#E2D5BF" },
    dark: { bg: "#3A342A", text: "#D1C0A5", hover: "#3A342A" },
  },
];

const STARRY: PaletteEntry[] = [
  {
    light: { bg: "#FFE0E9", text: "#8E3450", hover: "#FFD2DE" },
    dark: { bg: "#4A2836", text: "#F7B7C9", hover: "#55303F" },
  },
  {
    light: { bg: "#FFE9D2", text: "#8A4A17", hover: "#FFDDBC" },
    dark: { bg: "#4A3522", text: "#F5C79A", hover: "#553E29" },
  },
  {
    light: { bg: "#FFF4C9", text: "#6F560C", hover: "#FFECAF" },
    dark: { bg: "#453C1F", text: "#EFD889", hover: "#4F4526" },
  },
  {
    light: { bg: "#DDF5DE", text: "#20603A", hover: "#CBEFCD" },
    dark: { bg: "#234434", text: "#A9E0B7", hover: "#2A523E" },
  },
  {
    light: { bg: "#DCEDFF", text: "#1F4E7C", hover: "#C7E1FF" },
    dark: { bg: "#20374F", text: "#A8CDEE", hover: "#274261" },
  },
  {
    light: { bg: "#EDE4FF", text: "#4C3780", hover: "#E0D3FF" },
    dark: { bg: "#332A50", text: "#C7B5F0", hover: "#3D3360" },
  },
  {
    light: { bg: "#D9F4F1", text: "#1B5D58", hover: "#C4ECE8" },
    dark: { bg: "#1B3B3A", text: "#9FDDD7", hover: "#224846" },
  },
  {
    light: { bg: "#FFE7D8", text: "#8A4726", hover: "#FFD9C3" },
    dark: { bg: "#472C24", text: "#F2B79C", hover: "#523429" },
  },
];

function hash(value: string): number {
  let h = 0;
  for (let i = 0; i < value.length; i++) h = (h * 31 + value.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function eventColor(
  listId: string,
  theme: "light" | "dark",
  pack: EventPack = "classic"
): EventTone {
  const palette = pack === "starry" ? STARRY : CLASSIC;
  const entry = palette[hash(listId) % palette.length];
  return theme === "dark" ? entry.dark : entry.light;
}
