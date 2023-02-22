// Importing required functions and types from xstate library
import { MachineConfig, send, Action, assign } from "xstate";

// A function that returns an xstate action to send a "SPEAK" event with a given text value
function say(text: string): Action<SDSContext, SDSEvent> {
  return send((_context: SDSContext) => ({ type: "SPEAK", value: text }));
}

// An interface for defining grammar rules with intent and entity values
interface Grammar {
  [index: string]: {
    intent: string;
    entities: {
      [index: string]: string;
    };
  };
}
// An object that defines various grammar rules with intent and entity values
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
  "at 8:00 am": { 
    intent: "None",
    entities: { time: "8:00 AM" },
  },
  "at 9:00 am": { 
    intent: "None",
    entities: { time: "9:00 AM" },
  },"at 10:00 am": { 
    intent: "None",
    entities: { time: "10:00 AM" },
  },"at 11:00 am": { 
    intent: "None",
    entities: { time: "11:00 AM" },
  },"at noon": { 
    intent: "None",
    entities: { time: "12:00 PM" },
  },"at 12:00 am": { 
    intent: "None",
    entities: { time: "12:00 PM" },
  },
  "at 1:00 pm": { 
    intent: "None",
    entities: { time: "1:00 PM" },
  },"at 2:00 pm": { 
    intent: "None",
    entities: { time: "2:00 PM" },
  },"at 3:00 pm": { 
    intent: "None",
    entities: { time: "3:00 PM" },
  },"at 4:00 pm": { 
    intent: "None",
    entities: { time: "4:00 PM" },
  },"at 5:00 pm": { 
    intent: "None",
    entities: { time: "5:00 PM" },
  },"at 6:00 pm": { 
    intent: "None",
    entities: { time: "6:00 PM" },
  },"at 7:00 pm": { 
    intent: "None",
    entities: { time: "7:00 PM" },
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
    entities: { whole: "Yes", decision: "Yes", meeting:"Yes" },
  },
  "no": {
    intent: "None",
    entities: { whole: "No", decision: "No", meeting: "No" },
  },
  "create a meeting": {
    intent: "None",
    entities: { menu: "meeting"},
  }
  
};

// This function extracts the entity from the context and removes any query parameters and spaces from it
const setEntity_Query = (context: SDSContext) => {

  
  let u = String(context);

  return u.split("?")[0].split(" ").slice(2).join(" ");
  
};

// This function extracts the entity from the context and returns it
const setEntity = (context: SDSContext) => {

  
  let u = String(context.recResult[0].utterance);

  return u;
  
};

// This function checks if the provided entity is present in the grammar object and returns it if found
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

// This function sends a request to DuckDuckGo's API with the provided text and returns the JSON response
const kbRequest = (text: string) =>


  fetch(
    new Request(
      `https://cors.eu.org/https://api.duckduckgo.com/?q=${text}&format=json&skip_disambig=1`
    )
  ).then((data) => data.json());
    

// This exports a state machine for a dialogue manager 
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
        TTS_READY: "intro",
        CLICK: "intro",
      },
    },
    intro: {
      initial: "intro",
      on: {
        RECOGNISED: [
          {
            target: "intro_info",
            actions: assign({
              username: (context) => setEntity(context, "username"),
            }),
          },
        ],
        TIMEOUT: ".intro",
      },
      states: {
        intro: {
          entry: say("Hello, I am your personal assistant, how may I address you?"),
          on: { ENDSPEECH: "ask" },
        },
        ask: {
          entry: send("LISTEN"),
        },
        nomatch: {
          entry: say(
            "Sorry, I didn't quite get that, please tell me once more."
          ),
          on: { ENDSPEECH: "ask" },
        },
      },
    },
    intro_info: {
      entry: send((context) => ({
        type: "SPEAK",
        value: `Hello ${context.username}`,
      })),
      on: { ENDSPEECH: "menu" },
    },
    menu: {
      initial: "menu_choice",
      on: {
        RECOGNISED: [
          {
            target: "info_meeting",
            cond: (context) => !!getEntity(context, "menu"),
            actions: assign({
              menu: (context) => getEntity(context, "menu"),
            }),
          },
          {
            target: "search",
            cond: (context) => context.recResult[0].utterance.toLowerCase().replace(/\.$/g, "") != "create a meeting",
            actions: assign(
            {
              
              query: (context) => setEntity_Query(context.recResult[0].utterance),
            }),
          },   
          {
            target: ".nomatch",
          },
        ],
        TIMEOUT: ".menu_choice",
      },
      states: {
        menu_choice: {
          entry: say(`What would you like me to do?`),
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
    search: {
      invoke: {
        src: (context, event) => kbRequest(context.query),
        onDone: {
          target: 'success',
          actions: assign(
            {
              
              result: (context,event) => event.data.Abstract,
              title: (context) => context.query
            }),
        },
        onError: {
          target: 'failure',
          actions: (context, event) => console.log(event.data)
        }
      }
    },
    success: {
      entry: send((context) => ({
        type: "SPEAK",
        value: `OK, ${context.result}`,
      })),
      on: { ENDSPEECH: "meeting_ask" },
    },
    meeting_ask: {
      initial: "prompt",
      on: {
        RECOGNISED: [
          {
            target: "info",
            cond: (context) => getEntity(context, "meeting") === "Yes",
            actions: assign({
              meeting: (context) => getEntity(context, "meeting"),
              title: (context) => `meeting with ${context.query}`,
            }),
          },
          {
            target: "idle",
            cond: (context) => getEntity(context, "meeting") === "No",
            actions: assign({
              meeting: (context) => getEntity(context, "meeting"),
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
          entry: say("Would you like to meet them?"),
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

    failure: {
      entry: send((context) => ({
        type: "SPEAK",
        value: `I don't know who that is.`,
      })),
      on: { ENDSPEECH: "menu" },
    },
    info_meeting: {
      entry: send((context) => ({
        type: "SPEAK",
        value: `OK, let's create a ${context.menu}`,
      })),
      on: { ENDSPEECH: "meeting" },
    },
    meeting: {
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
          entry: say("What is it about?"),
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
