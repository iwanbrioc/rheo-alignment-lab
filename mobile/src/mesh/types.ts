export const categories = [
  "Essentials",
  "Belonging",
  "Learning",
  "Creativity",
  "Nature",
  "Purpose",
] as const;
export type Category = (typeof categories)[number];
export type PortalKind = "Place" | "People" | "Resource" | "Activity" | "Skill";
export type Coordinate = { latitude: number; longitude: number };
export type Portal = {
  id: string;
  name: string;
  description: string;
  category: Category;
  kind: PortalKind;
  steward: string;
  x: number;
  y: number;
  demo: boolean;
  shareable: boolean;
  received?: boolean;
  location?: Coordinate | null;
};
export type Connection = {
  id: string;
  from: string;
  to: string;
  relation: string;
  demo?: boolean;
  received?: boolean;
};
export type Session = {
  id: string;
  portalId: string;
  title: string;
  start: string;
  end: string;
  space: string;
  description: string;
  demo?: boolean;
};
export type MeshState = {
  version: 4;
  researchArm: null;
  portals: Portal[];
  links: Connection[];
  sessions: Session[];
  myPath: string[];
};
export type PortalInput = Pick<
  Portal,
  "name" | "description" | "category" | "kind" | "steward" | "shareable"
> & { location?: Coordinate | null };
export type SessionInput = Omit<Session, "id">;
