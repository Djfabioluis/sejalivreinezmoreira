import { describe, it, expect } from "vitest";
import { detectHumanTakeoverIntent } from "@/lib/human-takeover";
const yes=["Quero falar com um humano.","Quero falar com atendente.","Quero falar com uma pessoa.","Chama a recepção.","Quero falar com alguém.","Me passa para um atendente.","Quero atendimento humano.","Posso falar com a equipe?","Chama uma atendente.","Não quero falar com robô.","Quero falar com uma pessoa de verdade."];
const no=["Quero marcar amanhã","Oi","Você está aí?","Quero fazer manicure com a Ana","Preciso de ajuda"];
describe("humanTakeoverIntent",()=>{
 it("detecta",()=>{for(const t of yes) expect([t,detectHumanTakeoverIntent(t)]).toEqual([t,true]);});
 it("ignora",()=>{for(const t of no) expect([t,detectHumanTakeoverIntent(t)]).toEqual([t,false]);});
});
