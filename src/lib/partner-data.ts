import avid from "@/assets/partners/avid.png";
import atwellSuites from "@/assets/partners/atwell-suites.png";
import candlewoodSuites from "@/assets/partners/candlewood-suites.png";
import crownePlaza from "@/assets/partners/crowne-plaza.png";
import even from "@/assets/partners/even.png";
import holidayInn from "@/assets/partners/holiday-inn.png";
import holidayInnClubVacations from "@/assets/partners/holiday-inn-club-vacations.png";
import holidayInnExpress from "@/assets/partners/holiday-inn-express.png";
import hotelIndigo from "@/assets/partners/hotel-indigo.png";
import hualuxe from "@/assets/partners/hualuxe.png";
import iberostar from "@/assets/partners/iberostar.png";
import ihg from "@/assets/partners/ihg.png";
import intercontinental from "@/assets/partners/intercontinental.png";
import kimpton from "@/assets/partners/kimpton.png";
import regent from "@/assets/partners/regent.png";
import sixSenses from "@/assets/partners/six-senses.png";
import staybridgeSuites from "@/assets/partners/staybridge-suites.png";
import vignetteCollection from "@/assets/partners/vignette-collection.png";
import voco from "@/assets/partners/voco.png";
import type { HomeMedia, HomeNetworkPartner } from "@/lib/home-content";

const partner = (id: string, name: string, src: string): HomeNetworkPartner => ({
  id,
  name,
  logo: { src, type: "image", name: `${name} logo` } satisfies HomeMedia,
});

export const initialNetworkPartners: HomeNetworkPartner[] = [
  partner("ihg", "IHG Hotels & Resorts", ihg),
  partner("six-senses", "Six Senses", sixSenses),
  partner("regent", "Regent", regent),
  partner("intercontinental", "InterContinental Hotels & Resorts", intercontinental),
  partner("vignette-collection", "Vignette Collection", vignetteCollection),
  partner("kimpton", "Kimpton Hotels & Restaurants", kimpton),
  partner("hotel-indigo", "Hotel Indigo", hotelIndigo),
  partner("voco", "voco", voco),
  partner("hualuxe", "Hualuxe Hotels and Resorts", hualuxe),
  partner("crowne-plaza", "Crowne Plaza", crownePlaza),
  partner("iberostar", "Iberostar Beachfront Resorts", iberostar),
  partner("even", "EVEN Hotels", even),
  partner("holiday-inn-express", "Holiday Inn Express", holidayInnExpress),
  partner("holiday-inn", "Holiday Inn", holidayInn),
  partner("avid", "avid hotels", avid),
  partner("atwell-suites", "Atwell Suites", atwellSuites),
  partner("staybridge-suites", "Staybridge Suites", staybridgeSuites),
  partner("holiday-inn-club-vacations", "Holiday Inn Club Vacations", holidayInnClubVacations),
  partner("candlewood-suites", "Candlewood Suites", candlewoodSuites),
];
