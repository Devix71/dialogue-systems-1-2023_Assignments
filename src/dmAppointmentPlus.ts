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
  },
  "help": {
    intent: "None",
    entities: { help: "help"},
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



// This function extracts the entity from the context and returns it
const setEntity_counter = (context: SDSContext) => {


    if (context.counter == null ){
        context.counter = 0
    }

    


  
    return context.counter;
    
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
      entry: assign({ counter: (context) => setEntity_counter(context, 'counter') }),
      on: {
        RECOGNISED: [

          {
            target: "intro_info",
            cond: (context) => context.recResult[0].confidence > 0.5,
            actions: assign({
                
              username: (context) => setEntity(context, "username"),
            }),
          },
          {
            target: "intro_low_conf",
            cond: (context) => context.recResult[0].confidence < 0.5,
            actions: assign({
                  
              low_conf_utt: (context) => setEntity(context, "low_conf_utt"),
            }),
            },
          {
            target: ".nomatch",
            
          },


        ],
        TIMEOUT: [
            {
              target: ".timer",
              cond: (context) => context.counter < 3,
              actions: assign({
                counter: (context) => setEntity_counter(context, 'counter'),
              }),
            },
            {
              target: "init",
              cond: (context) => context.counter >= 3,
            },
          ],
      },
      states: {
        intro: {
          entry: say("Hello, I am your personal assistant, how may I address you?"),
          on: { ENDSPEECH: "ask" },
        },
        ask: {
          entry: [send("LISTEN"),
          //assign({confidence: (context) => setEntity_confidence(context),})
          
        ],
        },
        nomatch: {
          entry: say(
            "Sorry, I didn't quite get that, please tell me once more."
          ),
          on: { ENDSPEECH: "ask" },
        },
        timer: {
            entry:[ say(
              "Oh, you probably weren't paying attention, I'll ask again. How may I address you?"
            ),
            assign({ counter: (context) => context.counter+=1 }), // increment counter
            ],

            on: { ENDSPEECH: "ask" },
          },

      },
    },
    intro_low_conf: {
        initial: "prompt",
        entry: assign({ counter: (context) => context.counter = 0 }),
        on: {
          RECOGNISED: [
            {
              target: "intro_info",
              cond: (context) => context.recResult[0].utterance.toLowerCase().replace(/\.$/g, "") === "yes",
              actions: assign({
                username: (context) => context.low_conf_utt,
                //title: (context) => `meeting with ${context.query}`,
              }),
            },
            {
              target: "intro",
              cond: (context) => context.recResult[0].utterance.toLowerCase().replace(/\.$/g, "") === "no",
            },          
            {
              target: ".nomatch",
            },
  
          ],
          TIMEOUT: [
              {
                target: ".timer",
                cond: (context) => context.counter < 3,
                actions: assign({
                  counter: (context) => setEntity_counter(context, 'counter'),
                }),
              },
              {
                target: "init",
                cond: (context) => context.counter >= 3,
              },
            ],
  
        },
        states: {
          prompt: {
            entry: send((context) => ({
                type: "SPEAK",
                value: `Are you sure you meant ${context.low_conf_utt} ?`,
              })),
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
          timer: {
              entry: [send((context) => ({
                type: "SPEAK",
                value: `Oh you probably weren't paying attention. I'll ask again:
                Are you sure you meant ${context.low_conf_utt} ?`,
              })),
              
              assign({ counter: (context) => context.counter+=1 }),],
              
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
      entry: assign({ counter: (context) => context.counter = 0 }),
      on: {
        RECOGNISED: [
            {
                target: "info_meeting_help",
                cond: (context) => !!getEntity(context, "help"),
                actions: assign({
                  help: (context) => getEntity(context, "help"),
                }),
              },
              {
                target: "menu_low_conf",
                cond: (context) => context.recResult[0].confidence <0.5 && !!getEntity(context, "menu"),
                actions: assign({
                      
                  low_conf_utt: (context) => setEntity(context, "low_conf_utt"),
                }),
                },
          {
            target: "info_meeting",
            cond: (context) => context.recResult[0].confidence >= 0.5 && !!getEntity(context, "menu"),
            actions: assign({
              menu: (context) => getEntity(context, "menu"),
            }),
          },
          {
            target: "search",
            cond: (context) => context.recResult[0].confidence >= 0.5 && context.recResult[0].utterance.toLowerCase().replace(/\.$/g, "") != "create a meeting",
            actions: assign(
            {
              
              query: (context) => setEntity_Query(context.recResult[0].utterance),
            }),
          },   
          {
            target: "search_low_conf",
            cond: (context) => context.recResult[0].confidence < 0.5 && context.recResult[0].utterance.toLowerCase().replace(/\.$/g, "") != "create a meeting",
            actions: assign(
            {
              
              low_conf_utt: (context) => setEntity(context, "low_conf_utt"),
            }),
          },   

          {
            target: ".nomatch",
          },

        ],
        TIMEOUT: [
            {
              target: ".timer",
              cond: (context) => context.counter < 3,
              actions: assign({
                counter: (context) => setEntity_counter(context, 'counter'),
              }),
            },
            {
              target: "init",
              cond: (context) => context.counter >= 3,
            },
          ],

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
            "Sorry, I don't know how to do that. Tell me something I know."
          ),
          on: { ENDSPEECH: "ask" },
        },
        timer: {
            entry:[ say(
              "Oh, you probably weren't paying attention, I'll ask again. What would you like me to do?"
            ),
            assign({ counter: (context) => context.counter+=1 }),],
            on: { ENDSPEECH: "ask" },
          },

      },
    },
    menu_low_conf: {
      initial: "prompt",
      entry: assign({ counter: (context) => context.counter = 0 }),
      on: {
        RECOGNISED: [
          {
            target: "info_meeting",
            cond: (context) => context.recResult[0].utterance.toLowerCase().replace(/\.$/g, "") === "yes",
            actions: assign({
              menu: (context) => context.low_conf_utt,
              
            }),
          },
          {
            target: "menu",
            cond: (context) => context.recResult[0].utterance.toLowerCase().replace(/\.$/g, "") === "no",
          },          
          {
            target: ".nomatch",
          },

        ],
        TIMEOUT: [
            {
              target: ".timer",
              cond: (context) => context.counter < 3,
              actions: assign({
                counter: (context) => setEntity_counter(context, 'counter'),
              }),
            },
            {
              target: "init",
              cond: (context) => context.counter >= 3,
            },
          ],

      },
      states: {
        prompt: {
          entry: send((context) => ({
              type: "SPEAK",
              value: `Are you sure you meant ${context.low_conf_utt} ?`,
            })),
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
        timer: {
            entry: [send((context) => ({
              type: "SPEAK",
              value: `Oh you probably weren't paying attention. I'll ask again:
              Are you sure you meant ${context.low_conf_utt} ?`,
            })),
            
            assign({ counter: (context) => context.counter+=1 }),],
            
            on: { ENDSPEECH: "ask" },
          },
      },
    },
    search_low_conf: {
      initial: "prompt",
      entry: assign({ counter: (context) => context.counter = 0 }),
      on: {
        RECOGNISED: [
          {
            target: "search",
            cond: (context) => context.recResult[0].utterance.toLowerCase().replace(/\.$/g, "") === "yes",
            actions: assign({
              query: (context) => setEntity_Query(context.low_conf_utt),
            }),
          },
          {
            target: "menu",
            cond: (context) => context.recResult[0].utterance.toLowerCase().replace(/\.$/g, "") === "no",
          },          
          {
            target: ".nomatch",
          },

        ],
        TIMEOUT: [
            {
              target: ".timer",
              cond: (context) => context.counter < 3,
              actions: assign({
                counter: (context) => setEntity_counter(context, 'counter'),
              }),
            },
            {
              target: "init",
              cond: (context) => context.counter >= 3,
            },
          ],

      },
      states: {
        prompt: {
          entry: send((context) => ({
              type: "SPEAK",
              value: `Are you sure you meant ${context.low_conf_utt} ?`,
            })),
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
        timer: {
            entry: [send((context) => ({
              type: "SPEAK",
              value: `Oh you probably weren't paying attention. I'll ask again:
              Are you sure you meant ${context.low_conf_utt} ?`,
            })),
            
            assign({ counter: (context) => context.counter+=1 }),],
            
            on: { ENDSPEECH: "ask" },
          },
      },
    },
    info_meeting_help: {
        entry: send((context) => ({
          type: "SPEAK",
          value: `OK, for this question, the possible answers are either "create a meeting" or a question of the type "who is X?".`,
        })),
        on: { ENDSPEECH: "menu" },
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
      entry: assign({ counter: (context) => context.counter = 0 }),
      on: {
        RECOGNISED: [
            {
                target: "info_meeting_ask_help",
                cond: (context) => !!getEntity(context, "help"),
                actions: assign({
                  help: (context) => getEntity(context, "help"),
                }),
              },
          {
            target: "info",
            cond: (context) => context.recResult[0].confidence >= 0.5 && getEntity(context, "meeting") === "Yes",
            actions: assign({
              meeting: (context) => getEntity(context, "meeting"),
              title: (context) => `meeting with ${context.query}`,
            }),
          },
          {
            target: "meeting_ask_yes_low_conf",
            cond: (context) => context.recResult[0].confidence < 0.5 && getEntity(context, "meeting") === "Yes",
            actions: assign({
              low_conf_utt: (context) => setEntity(context, "low_conf_utt"),

            }),
          },
          {
            target: "idle",
            cond: (context) => context.recResult[0].confidence >= 0.5 && getEntity(context, "meeting") === "No",
            actions: assign({
              meeting: (context) => getEntity(context, "meeting"),
            }),
          },      
          {
            target: "meeting_ask_no_low_conf",
            cond: (context) => context.recResult[0].confidence < 0.5 && getEntity(context, "meeting") === "No",
            actions: assign({
              low_conf_utt: (context) => setEntity(context, "low_conf_utt"),

            }),
          },    
          {
            target: ".nomatch",
          },

        ],
        TIMEOUT: [
            {
              target: ".timer",
              cond: (context) => context.counter < 3,
              actions: assign({
                counter: (context) => setEntity_counter(context, 'counter'),
              }),
            },
            {
              target: "init",
              cond: (context) => context.counter >= 3,
            },
          ],

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
        timer: {
            entry: [say(
              "Oh, you probably weren't paying attention, I'll ask again. Would you like to meet them?"
            ),
            assign({ counter: (context) => context.counter+=1 }),],
            
            on: { ENDSPEECH: "ask" },
          },
      },
    },
    meeting_ask_yes_low_conf: {
      initial: "prompt",
      entry: assign({ counter: (context) => context.counter = 0 }),
      on: {
        RECOGNISED: [
          {
            target: "info",
            cond: (context) => context.recResult[0].utterance.toLowerCase().replace(/\.$/g, "") === "yes",
            actions: assign({
              meeting: (context) => setEntity(context.low_conf_utt),
              title: (context) => `meeting with ${context.query}`,
              
            }),
          },
          {
            target: "meeting_ask",
            cond: (context) => context.recResult[0].utterance.toLowerCase().replace(/\.$/g, "") === "no",
          },          
          {
            target: ".nomatch",
          },

        ],
        TIMEOUT: [
            {
              target: ".timer",
              cond: (context) => context.counter < 3,
              actions: assign({
                counter: (context) => setEntity_counter(context, 'counter'),
              }),
            },
            {
              target: "init",
              cond: (context) => context.counter >= 3,
            },
          ],

      },
      states: {
        prompt: {
          entry: send((context) => ({
              type: "SPEAK",
              value: `Are you sure you meant ${context.low_conf_utt} ?`,
            })),
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
        timer: {
            entry: [send((context) => ({
              type: "SPEAK",
              value: `Oh you probably weren't paying attention. I'll ask again:
              Are you sure you meant ${context.low_conf_utt} ?`,
            })),
            
            assign({ counter: (context) => context.counter+=1 }),],
            
            on: { ENDSPEECH: "ask" },
          },
      },
    },
    meeting_ask_no_low_conf: {
      initial: "prompt",
      entry: assign({ counter: (context) => context.counter = 0 }),
      on: {
        RECOGNISED: [
          {
            target: "idle",
            cond: (context) => context.recResult[0].utterance.toLowerCase().replace(/\.$/g, "") === "yes",

          },
          {
            target: "meeting_ask",
            cond: (context) => context.recResult[0].utterance.toLowerCase().replace(/\.$/g, "") === "no",
          },          
          {
            target: ".nomatch",
          },

        ],
        TIMEOUT: [
            {
              target: ".timer",
              cond: (context) => context.counter < 3,
              actions: assign({
                counter: (context) => setEntity_counter(context, 'counter'),
              }),
            },
            {
              target: "init",
              cond: (context) => context.counter >= 3,
            },
          ],

      },
      states: {
        prompt: {
          entry: send((context) => ({
              type: "SPEAK",
              value: `Are you sure you meant ${context.low_conf_utt} ?`,
            })),
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
        timer: {
            entry: [send((context) => ({
              type: "SPEAK",
              value: `Oh you probably weren't paying attention. I'll ask again:
              Are you sure you meant ${context.low_conf_utt} ?`,
            })),
            
            assign({ counter: (context) => context.counter+=1 }),],
            
            on: { ENDSPEECH: "ask" },
          },
      },
    },


    info_meeting_ask_help: {
        entry: send((context) => ({
          type: "SPEAK",
          value: `OK, for this question, the possible answers are either "yes" or "no.`,
        })),
        on: { ENDSPEECH: "meeting_ask" },
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
      entry: assign({ counter: (context) => context.counter = 0 }),
      on: {
        RECOGNISED: [
            {
                target: "meeting_help",
                cond: (context) => !!getEntity(context, "help"),
                actions: assign({
                  help: (context) => getEntity(context, "help"),
                }),
              },
          {
            target: "info",
            cond: (context) => context.recResult[0].confidence >= 0.5 && !!getEntity(context, "title"),
            actions: assign({
              title: (context) => getEntity(context, "title"),
            }),
          },
          {
            target: "meeting_low_conf",
            cond: (context) => context.recResult[0].confidence < 0.5 && !!getEntity(context, "title"),
            actions: assign({
              low_conf_utt: (context) => setEntity(context.low_conf_utt),
            }),
          },
          {
            target: ".nomatch",
          },

        ],
        TIMEOUT: [
            {
              target: ".timer",
              cond: (context) => context.counter < 3,
              actions: assign({
                counter: (context) => setEntity_counter(context, 'counter'),
              }),
            },
            {
              target: "init",
              cond: (context) => context.counter >= 3,
            },
          ],

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
        timer: {
            entry: [say(
              "Oh, you probably weren't paying attention, I'll ask again. What is it about?"
            ),
            assign({ counter: (context) => context.counter+=1 }),],
            on: { ENDSPEECH: "ask" },
          },
      },
    },
    meeting_low_conf: {
      initial: "prompt",
      entry: assign({ counter: (context) => context.counter = 0 }),
      on: {
        RECOGNISED: [
          {
            target: "day",
            cond: (context) => context.recResult[0].utterance.toLowerCase().replace(/\.$/g, "") === "yes",
            actions: assign({
              title: (context) => setEntity(context.low_conf_utt),
            }),
          },
          {
            target: "meeting",
            cond: (context) => context.recResult[0].utterance.toLowerCase().replace(/\.$/g, "") === "no",
          },          
          {
            target: ".nomatch",
          },

        ],
        TIMEOUT: [
            {
              target: ".timer",
              cond: (context) => context.counter < 3,
              actions: assign({
                counter: (context) => setEntity_counter(context, 'counter'),
              }),
            },
            {
              target: "init",
              cond: (context) => context.counter >= 3,
            },
          ],

      },
      states: {
        prompt: {
          entry: send((context) => ({
              type: "SPEAK",
              value: `Are you sure you meant ${context.low_conf_utt} ?`,
            })),
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
        timer: {
            entry: [send((context) => ({
              type: "SPEAK",
              value: `Oh you probably weren't paying attention. I'll ask again:
              Are you sure you meant ${context.low_conf_utt} ?`,
            })),
            
            assign({ counter: (context) => context.counter+=1 }),],
            
            on: { ENDSPEECH: "ask" },
          },
      },
    },

    meeting_help: {
        entry: send((context) => ({
          type: "SPEAK",
          value: `OK, for this question, the possible answers are either "lunch" or "lecture.`,
        })),
        on: { ENDSPEECH: "meeting" },
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
      entry: assign({ counter: (context) => context.counter = 0 }),
      on: {
        RECOGNISED: [
            {
                target: "day_help",
                cond: (context) => !!getEntity(context, "help"),
                actions: assign({
                  help: (context) => getEntity(context, "help"),
                }),
              },
          {
            target: "info_day",
            cond: (context) => context.recResult[0].confidence >= 0.5 && !!getEntity(context, "day"),
            actions: assign({
              day: (context) => getEntity(context, "day"),
            }),
          },
          {
            target: "day_low_conf",
            cond: (context) => context.recResult[0].confidence < 0.5 && !!getEntity(context, "day"),
            actions: assign({
              low_conf_utt: (context) => setEntity(context.low_conf_utt),
            }),
          },
          {
            target: ".nomatch",
          },

        ],
        TIMEOUT: [
            {
              target: ".timer",
              cond: (context) => context.counter < 3,
              actions: assign({
                counter: (context) => setEntity_counter(context, 'counter'),
              }),
            },
            {
              target: "init",
              cond: (context) => context.counter >= 3,
            },
          ],

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
        timer: {
            entry: [say(
              "Oh, you probably weren't paying attention, I'll ask again. On which day is it?"
            ),
            assign({ counter: (context) => context.counter+=1 }),],
            on: { ENDSPEECH: "ask" },
          },

      },

    },
    day_low_conf: {
      initial: "prompt",
      entry: assign({ counter: (context) => context.counter = 0 }),
      on: {
        RECOGNISED: [
          {
            target: "info_day",
            cond: (context) => context.recResult[0].utterance.toLowerCase().replace(/\.$/g, "") === "yes",
            actions: assign({
              day: (context) => setEntity(context.low_conf_utt),
            }),
          },
          {
            target: "day",
            cond: (context) => context.recResult[0].utterance.toLowerCase().replace(/\.$/g, "") === "no",
          },          
          {
            target: ".nomatch",
          },

        ],
        TIMEOUT: [
            {
              target: ".timer",
              cond: (context) => context.counter < 3,
              actions: assign({
                counter: (context) => setEntity_counter(context, 'counter'),
              }),
            },
            {
              target: "init",
              cond: (context) => context.counter >= 3,
            },
          ],

      },
      states: {
        prompt: {
          entry: send((context) => ({
              type: "SPEAK",
              value: `Are you sure you meant ${context.low_conf_utt} ?`,
            })),
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
        timer: {
            entry: [send((context) => ({
              type: "SPEAK",
              value: `Oh you probably weren't paying attention. I'll ask again:
              Are you sure you meant ${context.low_conf_utt} ?`,
            })),
            
            assign({ counter: (context) => context.counter+=1 }),],
            
            on: { ENDSPEECH: "ask" },
          },
      },
    },

    day_help: {
        entry: send((context) => ({
          type: "SPEAK",
          value: `OK, for this question, the possible answers are of the form "On X", where X is the name for a day of the week.`,
        })),
        on: { ENDSPEECH: "day" },
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
      entry: assign({ counter: (context) => context.counter = 0 }),
      on: {
        RECOGNISED: [
            {
                target: "whole_help",
                cond: (context) => !!getEntity(context, "help"),
                actions: assign({
                  help: (context) => getEntity(context, "help"),
                }),
              },
          {
            target: "info_whole",
            cond: (context) => context.recResult[0].confidence >= 0.5 && getEntity(context, "whole") === "Yes",
            actions: assign({
              whole: (context) => getEntity(context, "whole"),
            }),
          },
          {
            target: "whole_yes_low_conf",
            cond: (context) => context.recResult[0].confidence < 0.5 && getEntity(context, "whole") === "Yes",
            actions: assign({
              low_conf_utt: (context) => setEntity(context.low_conf_utt),
            }),
          },
          {
            target: "info_whole_no",
            cond: (context) => context.recResult[0].confidence >= 0.5 && getEntity(context, "whole") === "No",
            actions: assign({
              whole: (context) => getEntity(context, "whole"),
            }),
          },  
          {
            target: "whole_no_low_conf",
            cond: (context) => context.recResult[0].confidence < 0.5 && getEntity(context, "whole") === "No",
            actions: assign({
              low_conf_utt: (context) => setEntity(context.low_conf_utt),
            }),
          },        
          {
            target: ".nomatch",
          },

        ],
        TIMEOUT: [
            {
              target: ".timer",
              cond: (context) => context.counter < 3,
              actions: assign({
                counter: (context) => setEntity_counter(context, 'counter'),
              }),
            },
            {
              target: "init",
              cond: (context) => context.counter >= 3,
            },
          ],

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
        timer: {
            entry: [say(
              "Oh, you probably weren't paying attention, I'll ask again. Will it take the whole day?"
            ),
            assign({ counter: (context) => context.counter+=1 }),],
            on: { ENDSPEECH: "ask" },
          },

      },
    },
    whole_yes_low_conf: {
      initial: "prompt",
      entry: assign({ counter: (context) => context.counter = 0 }),
      on: {
        RECOGNISED: [
          {
            target: "info_whole",
            cond: (context) => context.recResult[0].utterance.toLowerCase().replace(/\.$/g, "") === "yes",
            actions: assign({
              whole: (context) => setEntity(context.low_conf_utt),

              
            }),
          },
          {
            target: "whole",
            cond: (context) => context.recResult[0].utterance.toLowerCase().replace(/\.$/g, "") === "no",
          },          
          {
            target: ".nomatch",
          },

        ],
        TIMEOUT: [
            {
              target: ".timer",
              cond: (context) => context.counter < 3,
              actions: assign({
                counter: (context) => setEntity_counter(context, 'counter'),
              }),
            },
            {
              target: "init",
              cond: (context) => context.counter >= 3,
            },
          ],

      },
      states: {
        prompt: {
          entry: send((context) => ({
              type: "SPEAK",
              value: `Are you sure you meant ${context.low_conf_utt} ?`,
            })),
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
        timer: {
            entry: [send((context) => ({
              type: "SPEAK",
              value: `Oh you probably weren't paying attention. I'll ask again:
              Are you sure you meant ${context.low_conf_utt} ?`,
            })),
            
            assign({ counter: (context) => context.counter+=1 }),],
            
            on: { ENDSPEECH: "ask" },
          },
      },
    },
    whole_no_low_conf: {
      initial: "prompt",
      entry: assign({ counter: (context) => context.counter = 0 }),
      on: {
        RECOGNISED: [
          {
            target: "info_whole_no",
            cond: (context) => context.recResult[0].utterance.toLowerCase().replace(/\.$/g, "") === "yes",
            actions: assign({
              whole: (context) => setEntity(context.low_conf_utt),

              
            }),

          },
          {
            target: "whole",
            cond: (context) => context.recResult[0].utterance.toLowerCase().replace(/\.$/g, "") === "no",
          },          
          {
            target: ".nomatch",
          },

        ],
        TIMEOUT: [
            {
              target: ".timer",
              cond: (context) => context.counter < 3,
              actions: assign({
                counter: (context) => setEntity_counter(context, 'counter'),
              }),
            },
            {
              target: "init",
              cond: (context) => context.counter >= 3,
            },
          ],

      },
      states: {
        prompt: {
          entry: send((context) => ({
              type: "SPEAK",
              value: `Are you sure you meant ${context.low_conf_utt} ?`,
            })),
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
        timer: {
            entry: [send((context) => ({
              type: "SPEAK",
              value: `Oh you probably weren't paying attention. I'll ask again:
              Are you sure you meant ${context.low_conf_utt} ?`,
            })),
            
            assign({ counter: (context) => context.counter+=1 }),],
            
            on: { ENDSPEECH: "ask" },
          },
      },
    },

    whole_help: {
        entry: send((context) => ({
          type: "SPEAK",
          value: `OK, for this question, the possible answers are either "yes" or "no".`,
        })),
        on: { ENDSPEECH: "whole" },
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
      entry: assign({ counter: (context) => context.counter = 0 }),
      on: {
        RECOGNISED: [
            {
                target: "time_help",
                cond: (context) => !!getEntity(context, "help"),
                actions: assign({
                  help: (context) => getEntity(context, "help"),
                }),
              },
          {
            target: "info_time",
            
            cond: (context) => context.recResult[0].confidence >= 0.5 && !!getEntity(context, "time") ,
            actions: assign({
              time: (context) => getEntity(context, "time"),
            }),
          },
          {
            target: "time_low_conf",
            
            cond: (context) => context.recResult[0].confidence < 0.5 && !!getEntity(context, "time") ,
            actions: assign({
              low_conf_utt: (context) => setEntity(context.low_conf_utt),
            }),
          },
          {

            target: ".nomatch",
          },

        ],
        TIMEOUT: [
            {
              target: ".timer",
              cond: (context) => context.counter < 3,
              actions: assign({
                counter: (context) => setEntity_counter(context, 'counter'),
              }),
            },
            {
              target: "init",
              cond: (context) => context.counter >= 3,
            },
          ],

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
        timer: {
            entry: [say(
              "Oh, you probably weren't paying attention, I'll ask again. What time is your meeting?"
            ),
            assign({ counter: (context) => context.counter+=1 }),],
            on: { ENDSPEECH: "ask" },
          },

      },

    },
    time_low_conf: {
      initial: "prompt",
      entry: assign({ counter: (context) => context.counter = 0 }),
      on: {
        RECOGNISED: [
          {
            target: "info_time",
            cond: (context) => context.recResult[0].utterance.toLowerCase().replace(/\.$/g, "") === "yes",
            actions: assign({
              time: (context) => setEntity(context.low_conf_utt),
            }),
          },
          {
            target: "time",
            cond: (context) => context.recResult[0].utterance.toLowerCase().replace(/\.$/g, "") === "no",
          },          
          {
            target: ".nomatch",
          },

        ],
        TIMEOUT: [
            {
              target: ".timer",
              cond: (context) => context.counter < 3,
              actions: assign({
                counter: (context) => setEntity_counter(context, 'counter'),
              }),
            },
            {
              target: "init",
              cond: (context) => context.counter >= 3,
            },
          ],

      },
      states: {
        prompt: {
          entry: send((context) => ({
              type: "SPEAK",
              value: `Are you sure you meant ${context.low_conf_utt} ?`,
            })),
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
        timer: {
            entry: [send((context) => ({
              type: "SPEAK",
              value: `Oh you probably weren't paying attention. I'll ask again:
              Are you sure you meant ${context.low_conf_utt} ?`,
            })),
            
            assign({ counter: (context) => context.counter+=1 }),],
            
            on: { ENDSPEECH: "ask" },
          },
      },
    },

    time_help: {
        entry: send((context) => ({
          type: "SPEAK",
          value: `OK, for this question, the possible answers are of the form "At X am/pm" where X is the time of the
          you want to have the meeting at, for example "At 5 pm", you can also say "at noon" instead of "at 12 pm".`,
        })),
        on: { ENDSPEECH: "time" },
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
      entry: assign({ counter: (context) => context.counter = 0 }),
      on: {
        RECOGNISED: [
            {
                target: "final_time_ask_help",
                cond: (context) => !!getEntity(context, "help"),
                actions: assign({
                  help: (context) => getEntity(context, "help"),
                }),
              },
          {
            target: "info_final_ask",
            cond: (context) => context.recResult[0].confidence >= 0.5 && getEntity(context, "decision") === "Yes",
            actions: assign({
              decision: (context) => getEntity(context, "decision"),
            }),
          },
          {
            target: "final_time_ask_yes_low_conf",
            cond: (context) => context.recResult[0].confidence < 0.5 && getEntity(context, "decision") === "Yes",
            actions: assign({
              low_conf_utt: (context) => setEntity(context.low_conf_utt),
            }),
          },
          {
            target: "idle",
            cond: (context) => context.recResult[0].confidence >= 0.5 && getEntity(context, "decision") === "No",
            actions: assign({
              whole: (context) => getEntity(context, "decision"),
            }),
          }, 
          {
            target: "final_time_ask_no_low_conf",
            cond: (context) => context.recResult[0].confidence < 0.5 && getEntity(context, "decision") === "No",
            actions: assign({
              low_conf_utt: (context) => setEntity(context.low_conf_utt),
            }),
          }, 

          {
            target: ".nomatch",
          },

        ],
        TIMEOUT: [
            {
              target: ".timer",
              cond: (context) => context.counter < 3,
              actions: assign({
                counter: (context) => setEntity_counter(context, 'counter'),
              }),
            },
            {
              target: "init",
              cond: (context) => context.counter >= 3,
            },
          ],

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
        timer: {
            entry: [send((context) => ({
                type: "SPEAK",
                value: `Oh you probably weren't paying attention. I'll ask again.
                Do you want me to create a meeting titled ${context.title} on ${context.day} at ${context.time}?`,
              })),
              assign({ counter: (context) => context.counter+=1 }),],
              on: { ENDSPEECH: "ask" },          },
      },
    },

    final_time_ask_yes_low_conf: {
      initial: "prompt",
      entry: assign({ counter: (context) => context.counter = 0 }),
      on: {
        RECOGNISED: [
          {
            target: "info_final_ask",
            cond: (context) => context.recResult[0].utterance.toLowerCase().replace(/\.$/g, "") === "yes",
            actions: assign({
              decision: (context) => setEntity(context.low_conf_utt),

              
            }),
          },
          {
            target: "final_time_ask",
            cond: (context) => context.recResult[0].utterance.toLowerCase().replace(/\.$/g, "") === "no",
          },          
          {
            target: ".nomatch",
          },

        ],
        TIMEOUT: [
            {
              target: ".timer",
              cond: (context) => context.counter < 3,
              actions: assign({
                counter: (context) => setEntity_counter(context, 'counter'),
              }),
            },
            {
              target: "init",
              cond: (context) => context.counter >= 3,
            },
          ],

      },
      states: {
        prompt: {
          entry: send((context) => ({
              type: "SPEAK",
              value: `Are you sure you meant ${context.low_conf_utt} ?`,
            })),
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
        timer: {
            entry: [send((context) => ({
              type: "SPEAK",
              value: `Oh you probably weren't paying attention. I'll ask again:
              Are you sure you meant ${context.low_conf_utt} ?`,
            })),
            
            assign({ counter: (context) => context.counter+=1 }),],
            
            on: { ENDSPEECH: "ask" },
          },
      },
    },
    final_time_ask_no_low_conf: {
      initial: "prompt",
      entry: assign({ counter: (context) => context.counter = 0 }),
      on: {
        RECOGNISED: [
          {
            target: "idle",
            cond: (context) => context.recResult[0].utterance.toLowerCase().replace(/\.$/g, "") === "yes",
            actions: assign({
              decision: (context) => setEntity(context.low_conf_utt),

              
            }),

          },
          {
            target: "final_time_ask",
            cond: (context) => context.recResult[0].utterance.toLowerCase().replace(/\.$/g, "") === "no",
          },          
          {
            target: ".nomatch",
          },

        ],
        TIMEOUT: [
            {
              target: ".timer",
              cond: (context) => context.counter < 3,
              actions: assign({
                counter: (context) => setEntity_counter(context, 'counter'),
              }),
            },
            {
              target: "init",
              cond: (context) => context.counter >= 3,
            },
          ],

      },
      states: {
        prompt: {
          entry: send((context) => ({
              type: "SPEAK",
              value: `Are you sure you meant ${context.low_conf_utt} ?`,
            })),
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
        timer: {
            entry: [send((context) => ({
              type: "SPEAK",
              value: `Oh you probably weren't paying attention. I'll ask again:
              Are you sure you meant ${context.low_conf_utt} ?`,
            })),
            
            assign({ counter: (context) => context.counter+=1 }),],
            
            on: { ENDSPEECH: "ask" },
          },
      },
    },

    final_time_ask_help: {
        entry: send((context) => ({
          type: "SPEAK",
          value: `OK, for this question, the possible answers are either "yes" or "no".`,
        })),
        on: { ENDSPEECH: "final_time_ask" },
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
      entry: assign({ counter: (context) => context.counter = 0 }),
      on: {
        RECOGNISED: [
            {
                target: "final_ask_help",
                cond: (context) => !!getEntity(context, "help"),
                actions: assign({
                  help: (context) => getEntity(context, "help"),
                }),
              },
          {
            target: "info_final_ask",
            cond: (context) => context.recResult[0].confidence >= 0.5 && getEntity(context, "decision") === "Yes",
            actions: assign({
              decision: (context) => getEntity(context, "decision"),
            }),
          },
          {
            target: "final_ask_yes_low_conf",
            cond: (context) => context.recResult[0].confidence < 0.5 && getEntity(context, "decision") === "Yes",
            actions: assign({
              low_conf_utt: (context) => setEntity(context.low_conf_utt),
            }),
          },

          {
            target: "idle",
            cond: (context) => context.recResult[0].confidence >= 0.5 && getEntity(context, "decision") === "No",
            actions: assign({
              whole: (context) => getEntity(context, "decision"),
            }),
          }, 
          {
            target: "final_ask_no_low_conf",
            cond: (context) => context.recResult[0].confidence < 0.5 && getEntity(context, "decision") === "No",
            actions: assign({
              low_conf_utt: (context) => setEntity(context.low_conf_utt),
            }),
          },
          {
            target: ".nomatch",
          },

        ],
        TIMEOUT: [
            {
              target: ".timer",
              cond: (context) => context.counter < 3,
              actions: assign({
                counter: (context) => setEntity_counter(context, 'counter'),
              }),
            },
            {
              target: "init",
              cond: (context) => context.counter > 3,
            },
          ],

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
          entry: say("Sorry, I didn't understand what you said."),
          on: { ENDSPEECH: "ask" },
        },
        timer: {
            entry: [send((context) => ({
                type: "SPEAK",
                value: `Oh you probably weren't paying attention. I'll ask again.
                Do you want me to create a meeting titled ${context.title} on ${context.day} for the whole day?`,
              })),
              assign({ counter: (context) => context.counter+=1 }),],
              on: { ENDSPEECH: "ask" },          },

      },
    },
    final_ask_yes_low_conf: {
      initial: "prompt",
      entry: assign({ counter: (context) => context.counter = 0 }),
      on: {
        RECOGNISED: [
          {
            target: "info_final_ask",
            cond: (context) => context.recResult[0].utterance.toLowerCase().replace(/\.$/g, "") === "yes",
            actions: assign({
              decision: (context) => setEntity(context.low_conf_utt),

              
            }),
          },
          {
            target: "final_ask",
            cond: (context) => context.recResult[0].utterance.toLowerCase().replace(/\.$/g, "") === "no",
          },          
          {
            target: ".nomatch",
          },

        ],
        TIMEOUT: [
            {
              target: ".timer",
              cond: (context) => context.counter < 3,
              actions: assign({
                counter: (context) => setEntity_counter(context, 'counter'),
              }),
            },
            {
              target: "init",
              cond: (context) => context.counter >= 3,
            },
          ],

      },
      states: {
        prompt: {
          entry: send((context) => ({
              type: "SPEAK",
              value: `Are you sure you meant ${context.low_conf_utt} ?`,
            })),
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
        timer: {
            entry: [send((context) => ({
              type: "SPEAK",
              value: `Oh you probably weren't paying attention. I'll ask again:
              Are you sure you meant ${context.low_conf_utt} ?`,
            })),
            
            assign({ counter: (context) => context.counter+=1 }),],
            
            on: { ENDSPEECH: "ask" },
          },
      },
    },
    final_ask_no_low_conf: {
      initial: "prompt",
      entry: assign({ counter: (context) => context.counter = 0 }),
      on: {
        RECOGNISED: [
          {
            target: "idle",
            cond: (context) => context.recResult[0].utterance.toLowerCase().replace(/\.$/g, "") === "yes",
            actions: assign({
              decision: (context) => setEntity(context.low_conf_utt),

              
            }),

          },
          {
            target: "final_ask",
            cond: (context) => context.recResult[0].utterance.toLowerCase().replace(/\.$/g, "") === "no",
          },          
          {
            target: ".nomatch",
          },

        ],
        TIMEOUT: [
            {
              target: ".timer",
              cond: (context) => context.counter < 3,
              actions: assign({
                counter: (context) => setEntity_counter(context, 'counter'),
              }),
            },
            {
              target: "init",
              cond: (context) => context.counter >= 3,
            },
          ],

      },
      states: {
        prompt: {
          entry: send((context) => ({
              type: "SPEAK",
              value: `Are you sure you meant ${context.low_conf_utt} ?`,
            })),
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
        timer: {
            entry: [send((context) => ({
              type: "SPEAK",
              value: `Oh you probably weren't paying attention. I'll ask again:
              Are you sure you meant ${context.low_conf_utt} ?`,
            })),
            
            assign({ counter: (context) => context.counter+=1 }),],
            
            on: { ENDSPEECH: "ask" },
          },
      },
    },

    final_ask_help: {
        entry: send((context) => ({
          type: "SPEAK",
          value: `OK, for this question, the possible answers are either "yes" or "no".`,
        })),
        on: { ENDSPEECH: "final_ask" },
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
