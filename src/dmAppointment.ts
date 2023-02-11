import { MachineConfig, send, Action, assign } from "xstate";

function say(text: string): Action<SDSContext, SDSEvent> {
  return send((_context: SDSContext) => ({ type: "SPEAK", value: text }));
}

interface Grammar {
  [index: string]: {
    intent: string;
    entities: {
      [index: string]: string;
    };
  };
}

const grammar: Grammar = {
  lecture: {
    intent: "None",
    entities: { title: "Dialogue systems lecture" },
  },
  lunch: {
    intent: "None",
    entities: { title: "Lunch at the canteen" },
  },
  "on friday": {
    intent: "None",
    entities: { day: "Friday" },
  },
  "at eight": { 
    intent: "None",
    entities: { time: "8:00" },
  },
  "at nine": { 
    intent: "None",
    entities: { time: "9:00" },
  },"at ten": { 
    intent: "None",
    entities: { time: "10:00" },
  },
  "at eleven": { 
    intent: "None",
    entities: { time: "11:00" },
  },  "at twelve": { 
    intent: "None",
    entities: { time: "12:00" },
  },  "at one": { 
    intent: "None",
    entities: { time: "13:00" },
  },  "at two": { 
    intent: "None",
    entities: { time: "14:00" },
  },  "at three": { 
    intent: "None",
    entities: { time: "15:00" },
  },  "at four": { 
    intent: "None",
    entities: { time: "16:00" },
  },  "at five": { 
    intent: "None",
    entities: { time: "17:00" },
  },  "at six": { 
    intent: "None",
    entities: { time: "18:00" },
  },  "at seven": { 
    intent: "None",
    entities: { time: "19:00" },
  },
  "on monday": {
    intent: "None",
    entities: { day: "Monday" },
  },
  "on tuesday": {
    intent: "None",
    entities: { day: "Tuesday" },
  },
  "on wednesday": {
    intent: "None",
    entities: { day: "Wednesday" },
  },
  "on thursday": {
    intent: "None",
    entities: { day: "Thursday" },
  },
  "on saturday": {
    intent: "None",
    entities: { day: "Saturday" },
  },
  "on sunday": {
    intent: "None",
    entities: { day: "Sunday" },
  },
  "yes": {
    intent: "None",
    entities: { whole: "Yes", decision: "Yes" },
  },
  "no": {
    intent: "None",
    entities: { whole: "No", decision: "No" },
  }
  
};

const getEntity = (context: SDSContext, entity: string) => {
  // lowercase the utterance and remove tailing "."
  let u = context.recResult[0].utterance.toLowerCase().replace(/\.$/g, "");
  if (u in grammar) {
    if (entity in grammar[u].entities) {
      return grammar[u].entities[entity];
    }
  }
  return false;
};


export const dmMachine: MachineConfig<SDSContext, any, SDSEvent> = {
  initial: "idle",
  states: {
    idle: {
      on: {
        CLICK: "init",
      },
    },
    init: {
      on: {
        TTS_READY: "welcome",
        CLICK: "welcome",
      },
    },
    welcome: {
      initial: "prompt",
      on: {
        RECOGNISED: [
          {
            target: "info_title",
            cond: (context) => !!getEntity(context, "title"),
            actions: assign({
              title: (context) => getEntity(context, "title"),
            }),
          },
          {
            target: "info_day",
            cond: (context) => !!getEntity(context, "day"),
            actions: assign({
              day: (context) => getEntity(context, "day"),
            }),
          },
          {
            target: "info_time",
            cond: (context) => !!getEntity(context, "time"),
            actions: assign({
              time: (context) => getEntity(context, "time"),
            }),
          },
          {
            target: "info_whole",
            cond: (context) => !!getEntity(context, "whole"),
            actions: assign({
              whole: (context) => getEntity(context, "whole"),
            }),
          },
          {
            target: "info_decision",
            cond: (context) => !!getEntity(context, "decision"),
            actions: assign({
              decision: (context) => getEntity(context, "decision"),
            }),
          },
          {
            target: ".nomatch_topic",
          },
        ],
        TIMEOUT: ".prompt",
      },
      states: {
        prompt: {
          entry: say("Let's create a meeting. What is it about?"),
          on: { ENDSPEECH: "ask" },
        },
        ask: {
          entry: send("LISTEN"),
        },
        day_prompt: {
          entry: say("On which day it is?"),
          on: {ENDSPEECH: "ask_day"},
        },
        ask_day:{
          entry: send("LISTEN"),
        },
        whole_prompt: {
          entry: say("Will it take the whole day?"),
          on: {ENDSPEECH: "ask_whole"},
        },
        ask_whole:{
          entry: send("LISTEN")
        },
        time_prompt:{
          entry: say("What time is your meeting?"),
          on: {ENDSPEECH: "ask_time"},
        },
        ask_time:{
          entry: send("LISTEN")
        },
        final_prompt:{
          entry: send((context) => ({
            type: "SPEAK",
            value: `Do you want me to create a meeting titled ${context.title} on ${context.day} for the whole day?`,
          })),
          on: { ENDSPEECH: "final_ask" },
        },
        final_time_prompt:{
          entry: send((context) => ({
            type: "SPEAK",
            value: `Do you want me to create a meeting titled ${context.title} on ${context.day} at ${context.time} ?`,
          })),
          on: { ENDSPEECH: "final_time_ask" },
        },
        

        nomatch_topic: {
          entry: say(
            "Sorry, I don't know what it is. Tell me something I know."
          ),
          on: { ENDSPEECH: "ask" },
        },
      },
    },
    info_title: {
      entry: send((context) => ({
        type: "SPEAK",
        value: `OK, ${context.title}`,
      })),
      on: { ENDSPEECH: "day_prompt" },
    },
    info_whole:{
      entry: send((context) => ({
        type: "SPEAK",
        value: `OK, ${context.whole}`,
      })),
      on: { ENDSPEECH: (context: { whole: string; }) => context.whole === "yes" ? "time_prompt" : "final_prompt" },
    },
    info_day: {
      entry: send((context) => ({
        type: "SPEAK",
        value: `OK, ${context.day}`,
      })),
      on: { ENDSPEECH: "whole_prompt" },
    },
    info_time: {
      entry: send((context) => ({
        type: "SPEAK",
        value: `OK, ${context.time}`,
      })),
      on: { ENDSPEECH: "final_time_prompt" },
    },


    
  },
};

const kbRequest = (text: string) =>
  fetch(
    new Request(
      `https://cors.eu.org/https://api.duckduckgo.com/?q=${text}&format=json&skip_disambig=1`
    )
  ).then((data) => data.json());