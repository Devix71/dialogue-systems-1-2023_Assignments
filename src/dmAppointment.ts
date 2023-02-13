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
  "at 8:00": { 
    intent: "None",
    entities: { time: "8:00" },
  },
  "at 9:00": { 
    intent: "None",
    entities: { time: "9:00" },
  },"at 10:00": { 
    intent: "None",
    entities: { time: "10:00" },
  },"at 11:00": { 
    intent: "None",
    entities: { time: "11:00" },
  },"at noon": { 
    intent: "None",
    entities: { time: "12:00" },
  },"at 1:00 pm": { 
    intent: "None",
    entities: { time: "13:00" },
  },"at 2:00 pm": { 
    intent: "None",
    entities: { time: "14:00" },
  },"at 3:00 pm": { 
    intent: "None",
    entities: { time: "15:00" },
  },"at 4:00 pm": { 
    intent: "None",
    entities: { time: "16:00" },
  },"at 5:00 pm": { 
    intent: "None",
    entities: { time: "17:00" },
  },"at 6:00 pm": { 
    intent: "None",
    entities: { time: "18:00" },
  },"at 7:00 pm": { 
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
  console.log(u);
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
            target: "info",
            cond: (context) => !!getEntity(context, "title"),
            actions: assign({
              title: (context) => getEntity(context, "title"),
            }),
          },
          {
            target: ".nomatch",
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
        nomatch: {
          entry: say(
            "Sorry, I don't know what it is. Tell me something I know."
          ),
          on: { ENDSPEECH: "ask" },
        },
      },
    },
    info: {
      entry: send((context) => ({
        type: "SPEAK",
        value: `OK, ${context.title}`,
      })),
      on: { ENDSPEECH: "day" },
    },
    day: {
      initial: "prompt",
      on: {
        RECOGNISED: [
          {
            target: "info_day",
            cond: (context) => !!getEntity(context, "day"),
            actions: assign({
              day: (context) => getEntity(context, "day"),
            }),
          },
          {
            target: ".nomatch",
          },
        ],
        TIMEOUT: ".prompt",
      },
      states: {
        prompt: {
          entry: say("On which day is it?"),
          on: { ENDSPEECH: "ask" },
        },
        ask: {
          entry: send("LISTEN"),
        },
        nomatch: {
          entry: say("Sorry, I don't understand which day you are referring to."),
          on: { ENDSPEECH: "ask" },
        },

      },

    },
    info_day: {
      entry: send((context) => ({
        type: "SPEAK",
        value: `OK, ${context.day}`,
      })),
      on: { ENDSPEECH: "whole" },
    },
    whole: {
      initial: "prompt",
      on: {
        RECOGNISED: [
          {
            target: "info_whole",
            cond: (context) => getEntity(context, "whole") === "Yes",
            actions: assign({
              whole: (context) => getEntity(context, "whole"),
            }),
          },
          {
            target: "info_whole_no",
            cond: (context) => getEntity(context, "whole") === "No",
            actions: assign({
              whole: (context) => getEntity(context, "whole"),
            }),
          },          
          {
            target: ".nomatch",
          },
        ],
        TIMEOUT: ".prompt",
      },
      states: {
        prompt: {
          entry: say("Will it take the whole day?"),
          on: { ENDSPEECH: "ask" },
        },
        ask: {
          entry: send("LISTEN"),
        },
        nomatch: {
          entry: say("Sorry, I don't understand your answer."),
          on: { ENDSPEECH: "ask" },
        },

      },
    },
    info_whole_no: {
      entry: send((context) => ({
        type: "SPEAK",
        value: `OK, I'll take that as ${context.whole}`,
      })),
      on: { ENDSPEECH: "time" },
    },
    time: {
      initial: "prompt",
      on: {
        RECOGNISED: [
          {
            target: "info_time",
            
            cond: (context) => !!getEntity(context, "time") ,
            actions: assign({
              time: (context) => getEntity(context, "time"),
            }),
          },
          {

            target: ".nomatch",
          },
        ],
        TIMEOUT: ".prompt",
      },
      states: {
        prompt: {
          entry: say("What time is your meeting?"),
          on: { ENDSPEECH: "ask" },
        },
        ask: {
          entry: send("LISTEN"),
        },
        nomatch: {
          entry: say("Sorry, I don't understand what time you are referring to."),
          on: { ENDSPEECH: "ask" },
        },

      },

    },
    info_time:{
      entry: send((context) => ({
        type: "SPEAK",
        value: `OK, ${context.time}`,
      })),
      on: { ENDSPEECH: "final_time_ask" },
    },
    final_time_ask: {
      initial: "prompt",
      on: {
        RECOGNISED: [
          {
            target: "info_final_ask",
            cond: (context) => !!getEntity(context, "decision"),
            actions: assign({
              decision: (context) => getEntity(context, "decision"),
            }),
          },
          {
            target: ".nomatch",
          },
        ],
        TIMEOUT: ".prompt",
      },
      states: {
        prompt: {
          entry: send((context) => ({
            type: "SPEAK",
            value: `Do you want me to create a meeting titled ${context.title} on ${context.day} at ${context.time}?`,
          })),
          on: { ENDSPEECH: "ask" },
        },
        ask: {
          entry: send("LISTEN"),
        },
        nomatch: {
          entry: say("Sorry, I don't understand which day you are referring to."),
          on: { ENDSPEECH: "ask" },
        },

      },
    },

    info_whole: {
      entry: send((context) => ({
        type: "SPEAK",
        value: `OK, I'll take that as ${context.whole}`,
      })),
      on: { ENDSPEECH: "final_ask" },
    },
    final_ask: {
      initial: "prompt",
      on: {
        RECOGNISED: [
          {
            target: "info_final_ask",
            cond: (context) => getEntity(context, "decision") === "Yes",
            actions: assign({
              decision: (context) => getEntity(context, "decision"),
            }),
          },
          {
            target: "idle",
            cond: (context) => getEntity(context, "decision") === "No",
            actions: assign({
              whole: (context) => getEntity(context, "decision"),
            }),
          }, 
          {
            target: ".nomatch",
          },
        ],
        TIMEOUT: ".prompt",
      },
      states: {
        prompt: {
          entry: send((context) => ({
            type: "SPEAK",
            value: `Do you want me to create a meeting titled ${context.title} on ${context.day} for the whole day?`,
          })),
          on: { ENDSPEECH: "ask" },
        },
        ask: {
          entry: send("LISTEN"),
        },
        nomatch: {
          entry: say("Sorry, I don't understand which day you are referring to."),
          on: { ENDSPEECH: "ask" },
        },

      },
    },
    info_final_ask: {
      entry: send((context) => ({
        type: "SPEAK",
        value: `OK, I'll take that as ${context.decision}`,
      })),
      on: { ENDSPEECH: "final_prompt" },
    },
    final_prompt: {
      entry: send((context) => ({
        type: "SPEAK",
        value: `Your meeting as been created`,
      })),
      on: { ENDSPEECH: "idle" },


      
    },
  },
};
const kbRequest = (text: string) =>
  fetch(
    new Request(
      `https://cors.eu.org/https://api.duckduckgo.com/?q=${text}&format=json&skip_disambig=1`
    )
  ).then((data) => data.json());
