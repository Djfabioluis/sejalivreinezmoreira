import { SALON_TZ } from "./booking/local-date";
import { logger } from "./observability/logger.server";

export interface ServiceHour {
  day_of_week: number;
  is_active: boolean;
  opening_time: string;
  closing_time: string;
}

export interface ServiceHoursStatus {
  isOpen: boolean;
  dayOfWeek: number;
  localTime: string;
  openingTime?: string;
  closingTime?: string;
  nextOpening?: {
    day: string;
    time: string;
    isoDate: string;
  };
}

export async function getUnitServiceHours(unitId: string): Promise<ServiceHour[]> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("wa_julia_service_hours")
    .select("day_of_week, is_active, opening_time, closing_time")
    .eq("unidade_id", unitId);

  if (error) {
    logger.error("GET_UNIT_SERVICE_HOURS_ERROR", "Failed to fetch service hours", { unitId, error });
    return [];
  }

  return data || [];
}

export function isJuliaWithinServiceHours(
  hours: ServiceHour[],
  currentDate: Date,
  timezone: string = SALON_TZ
): ServiceHoursStatus {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    hour12: false,
    weekday: "numeric", 
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  });

  const parts = formatter.formatToParts(currentDate);
  const get = (type: string) => parts.find(p => p.type === type)?.value || "00";
  
  // Intl.DateTimeFormat 'weekday' with 'numeric' returns a string like "1" to "7".
  // Note: Standard JS getDay() is 0=Sun, 1=Mon. 
  // We'll use a safer way to get the local day of week to match our 0-6 day_of_week config.
  const localDateStr = currentDate.toLocaleString("en-US", { timeZone: timezone });
  const localDay = new Date(localDateStr).getDay();
  const localTime = `${get("hour")}:${get("minute")}`;
  
  const config = hours.find(h => h.day_of_week === localDay);

  if (!config || !config.is_active) {
    return { 
      isOpen: false, 
      dayOfWeek: localDay, 
      localTime,
      nextOpening: calculateNextOpening(hours, currentDate, timezone)
    };
  }

  // Inclusive opening_time, exclusive closing_time
  const isOpen = localTime >= config.opening_time && localTime < config.closing_time;

  return {
    isOpen,
    dayOfWeek: localDay,
    localTime,
    openingTime: config.opening_time,
    closingTime: config.closing_time,
    nextOpening: !isOpen ? calculateNextOpening(hours, currentDate, timezone) : undefined
  };
}

function calculateNextOpening(
  hours: ServiceHour[],
  currentDate: Date,
  timezone: string
): ServiceHoursStatus["nextOpening"] {
  if (hours.length === 0) return undefined;

  const activeHours = hours.filter(h => h.is_active).sort((a, b) => a.day_of_week - b.day_of_week);
  if (activeHours.length === 0) return undefined;

  const localDateStr = currentDate.toLocaleString("en-US", { timeZone: timezone });
  const now = new Date(localDateStr);
  const currentDay = now.getDay();
  const currentTime = now.getHours().toString().padStart(2, '0') + ":" + now.getMinutes().toString().padStart(2, '0');

  // Check today (if not yet opened)
  const today = activeHours.find(h => h.day_of_week === currentDay);
  if (today && currentTime < today.opening_time) {
    return {
      day: "hoje",
      time: today.opening_time.slice(0, 5),
      isoDate: new Date(now).toISOString()
    };
  }

  // Look for next days
  for (let i = 1; i <= 7; i++) {
    const nextDayNum = (currentDay + i) % 7;
    const nextDay = activeHours.find(h => h.day_of_week === nextDayNum);
    if (nextDay) {
      const date = new Date(now);
      date.setDate(date.getDate() + i);
      
      const dayNames = ["domingo", "segunda-feira", "terça-feira", "quarta-feira", "quinta-feira", "sexta-feira", "sábado"];
      const label = i === 1 ? "amanhã" : dayNames[nextDayNum];

      return {
        day: label,
        time: nextDay.opening_time.slice(0, 5),
        isoDate: date.toISOString()
      };
    }
  }

  return undefined;
}
