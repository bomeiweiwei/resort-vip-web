export type ItinerarySchedule = {
  time: string;
  title: string;
  content: string;
  preference: number;
};

export type ItineraryDateGroup = {
  date: string;
  schedules: ItinerarySchedule[];
};