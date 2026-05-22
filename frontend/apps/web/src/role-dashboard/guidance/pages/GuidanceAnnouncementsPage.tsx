import type { GuidanceData } from "../types";
import { RoleAnnouncementsPage } from "../../pages/RoleAnnouncementsPage";

export function GuidanceAnnouncementsPage({ data }: { data: GuidanceData }) {
  return <RoleAnnouncementsPage announcements={data.announcements} />;
}
