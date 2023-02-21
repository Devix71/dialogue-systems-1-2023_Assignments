// Importing required functions and types from xstate library
import { MachineConfig, send, Action, assign } from "xstate";

// A function that returns an xstate action to send a "SPEAK" event with a given text value
function say(text: string): Action<SDSContext, SDSEvent> {
  return send((_context: SDSContext) => ({ type: "SPEAK", value: text }));
}



// This function extracts the entity from the context and removes any query parameters and spaces from it
const setEntity_Query = (context: SDSContext) => {

  
  let u = String(context);

  return u.split("?")[0].split(" ").slice(2).join(" ");
  
};

// This function extracts the entity from the context and returns it
const setEntity = (context: SDSContext) => {

  
  let u = String(context.recResult[0].utterance);

  console.log(u)

  return u;
  
};

//This function sends a request Azure's CLU API with the provided text and returns the JSON response
const getIntents = (uttering: string) =>
  fetch(
    new Request("https://langauge-res-20345.cognitiveservices.azure.com/language/:analyze-conversations?api-version=2022-10-01-preview", {
      method: "POST",
      headers: {
        "Ocp-Apim-Subscription-Key": "1a397e0824494c3181333cc861fa156f",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        kind: "Conversation",
        analysisInput: {
          conversationItem: {
            id: "PARTICIPANT_ID_HERE",
            text: uttering,
            modality: "text",
            language: "en-US",
            participantId: "PARTICIPANT_ID_HERE",
          },
        },
        parameters: {
          projectName: "appointments",
          verbose: true,
          deploymentName: "appointment",
          stringIndexType: "TextElement_V8",
        },
      }),
    })
  ).then((data) => data.json());


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
            target: "info_choice",
            cond: (context) => context.recResult[0].utterance.toLowerCase().replace(/\.$/g, "") != null,
            actions: assign({
              menu: (context) => setEntity(context, "menu"),
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
          entry: say(`What would you like to do or find more about?`),
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
    info_choice: {
      invoke: {
        src: (context, event) => getIntents(context.menu),
        onDone: [
          {
            target: 'success_meeting',
            cond: (context, event) => event.data.result.prediction.topIntent === "create a meeting",
            actions: assign({
              title: (_context, event) => event.data.result.prediction.entities[0].text,
            }),
          },
          {
            target: 'success_question',
            cond: (context, event) => event.data.result.prediction.topIntent === "who is X",
            actions: assign({
              query: (_context, event) => event.data.result.prediction.entities[0].text,
            }),
          },
          {
            target: 'unrecognized_choice',
            cond: (context, event) => event.data.result.prediction.topIntent != "who is X" && event.data.result.prediction.topIntent!= "create a meeting",
            actions: (context, event) => console.log(event.data.result)
          },
        ],
        onError: {
          target: 'failure_choice',
          actions: (context, event) => console.log(event.data)
        }
      }
    },
    unrecognized_choice: {
      entry: send((context) => ({
        type: "SPEAK",
        value: `Sorry, I didn't understand that.`,
      })),
      on: { ENDSPEECH: "menu" },
    },
    success_meeting: {
      entry: send((context) => ({
        type: "SPEAK",
        value: `OK, creating the meeting ${context.title}`,
      })),
      on: { ENDSPEECH: "day" },
    },
    success_question: {
      entry: send((context) => ({
        type: "SPEAK",
        value: `OK, fetching info on ${context.query}`,
      })),
      on: { ENDSPEECH: "search" },
    },
    failure_choice: {
      entry: send((context) => ({
        type: "SPEAK",
        value: `I don't know who that is.`,
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
              title: (context) => `meeting with ${context.query}` 
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
            target: "ask_meeting_choice",
            cond: (context) => context.recResult[0].utterance.toLowerCase().replace(/\.$/g, "") != null,
            actions: assign({
              meeting: (context) => setEntity(context, "meeting"),
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
    ask_meeting_choice: {
      invoke: {
        src: (context, event) => getIntents(context.meeting),
        onDone: [
          {
            target: 'success_deny_meeting',
            cond: (context, event) => event.data.result.prediction.topIntent === "Negative",

          },
          {
            target: 'success_agree_meeting',
            cond: (context, event) => event.data.result.prediction.topIntent === "Affirmative",

          },
          {
            target: 'unrecognized_meeting',
            cond: (context, event) => event.data.result.prediction.topIntent != "Affirmative" && event.data.result.prediction.topIntent != "Negative",
            actions: (context, event) => console.log(event.data.result)
          },
        ],
        onError: {
          target: 'failure_meeting',
          actions: (context, event) => console.log(event.data)
        }
      }
    },

    failure: {
      entry: send((context) => ({
        type: "SPEAK",
        value: `I don't know who that is.`,
      })),
      on: { ENDSPEECH: "menu" },
    },
    unrecognized_meeting: {
      entry: send((context) => ({
        type: "SPEAK",
        value: `Sorry, I didn't understand that.`,
      })),
      on: { ENDSPEECH: "meeting_ask" },
    },
    success_deny_meeting: {
      entry: send((context) => ({
        type: "SPEAK",
        value: `OK, noted`,
      })),
      on: { ENDSPEECH: "idle" },
    },
    success_agree_meeting: {
      entry: send((context) => ({
        type: "SPEAK",
        value: `OK, ${context.title}`,
      })),
      on: { ENDSPEECH: "day" },
    },
    failure_meeting: {
      entry: send((context) => ({
        type: "SPEAK",
        value: `I don't know who that is.`,
      })),
      on: { ENDSPEECH: "menu" },
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
            cond: (context) => context.recResult[0].utterance.toLowerCase().replace(/\.$/g, "") != null,
            actions: assign({
              day: (context) => setEntity(context, "day"),
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
      invoke: {
        src: (context, event) => getIntents(context.day),
        onDone: [
          {
            target: 'success_day',
            cond: (context, event) => event.data.result.prediction.topIntent === "Days",
            actions: assign({
            day: (_context, event) => event.data.result.prediction.entities[0].text,
            }),
          },
          {
            target: 'unrecognized_day',
            cond: (context, event) => event.data.result.prediction.topIntent != "Days",
            actions: (context, event) => console.log(event.data.result)
          },
        ],
        onError: {
          target: 'failure_day',
          actions: (context, event) => console.log(event.data)
        }
      }
    },
    unrecognized_day: {
      entry: send((context) => ({
        type: "SPEAK",
        value: `Sorry, I didn't understand that.`,
      })),
      on: { ENDSPEECH: "day" },
    },
    success_day: {
      entry: send((context) => ({
        type: "SPEAK",
        value: `OK, ${context.day}`,
      })),
      on: { ENDSPEECH: "whole" },
    },
    failure_day: {
      entry: send((context) => ({
        type: "SPEAK",
        value: `I don't know who that is.`,
      })),
      on: { ENDSPEECH: "day" },
    },
    whole: {
      initial: "prompt",
      on: {
        RECOGNISED: [
          {
            target: "info_whole",
            cond: (context) => context.recResult[0].utterance.toLowerCase().replace(/\.$/g, "") != null,
            actions: assign({
              whole: (context) => setEntity(context, "whole"),
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
    info_whole: {
      invoke: {
        src: (context, event) => getIntents(context.whole),
        onDone: [
          {
            target: 'success_deny_whole',
            cond: (context, event) => event.data.result.prediction.topIntent === "Negative",

          },
          {
            target: 'success_agree_whole',
            cond: (context, event) => event.data.result.prediction.topIntent === "Affirmative",

          },
          {
            target: 'unrecognized_whole',
            cond: (context, event) => event.data.result.prediction.topIntent != "Affirmative" && event.data.result.prediction.topIntent != "Negative",
            actions: (context, event) => console.log(event.data.result)
          },
        ],
        onError: {
          target: 'failure_whole',
          actions: (context, event) => console.log(event.data)
        }
      }
    },
    unrecognized_whole: {
      entry: send((context) => ({
        type: "SPEAK",
        value: `Sorry, I didn't understand that.`,
      })),
      on: { ENDSPEECH: "whole" },
    },
    success_deny_whole: {
      entry: send((context) => ({
        type: "SPEAK",
        value: `OK, noted`,
      })),
      on: { ENDSPEECH: "time" },
    },
    success_agree_whole: {
      entry: send((context) => ({
        type: "SPEAK",
        value: `OK, understood`,
      })),
      on: { ENDSPEECH: "final_ask" },
    },
    failure_whole: {
      entry: send((context) => ({
        type: "SPEAK",
        value: `I don't know who that is.`,
      })),
      on: { ENDSPEECH: "whole" },
    },
    time: {
      initial: "prompt",
      on: {
        RECOGNISED: [
          {
            target: "info_time",
            
            cond: (context) => context.recResult[0].utterance.toLowerCase().replace(/\.$/g, "") != null,
            actions: assign({
              time: (context) => setEntity(context, "time"),
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
      invoke: {
        src: (context, event) => getIntents(context.time),
        onDone: [
          {
            target: 'success_time',
            cond: (context, event) => event.data.result.prediction.topIntent === "Time",
            actions: assign({
            time: (_context, event) => event.data.result.prediction.entities[0].text,
            }),
          },
          {
            target: 'unrecognized_time',
            cond: (context, event) => event.data.result.prediction.topIntent != "Time",
            actions: (context, event) => console.log(event.data.result)
          },
        ],
        onError: {
          target: 'failure_time',
          actions: (context, event) => console.log(event.data)
        }
      }
    },
    unrecognized_time: {
      entry: send((context) => ({
        type: "SPEAK",
        value: `Sorry, I didn't understand that.`,
      })),
      on: { ENDSPEECH: "time" },
    },
    success_time: {
      entry: send((context) => ({
        type: "SPEAK",
        value: `OK, ${context.time}`,
      })),
      on: { ENDSPEECH: "final_time_ask" },
    },
    failure_time: {
      entry: send((context) => ({
        type: "SPEAK",
        value: `I don't know who that is.`,
      })),
      on: { ENDSPEECH: "time" },
    },
    final_time_ask: {
      initial: "prompt",
      on: {
        RECOGNISED: [
          {
            target: "info_final_time_ask",
            cond: (context) => context.recResult[0].utterance.toLowerCase().replace(/\.$/g, "") != null,
            actions: assign({
              decision: (context) => setEntity(context, "decision"),
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


    final_ask: {
      initial: "prompt",
      on: {
        RECOGNISED: [
          {
            target: "info_final_ask",
            cond: (context) => context.recResult[0].utterance.toLowerCase().replace(/\.$/g, "") != null,
            actions: assign({
              decision: (context) => setEntity(context, "decision"),
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
      invoke: {
        src: (context, event) => getIntents(context.decision),
        onDone: [
          {
            target: 'success_deny_final_ask',
            cond: (context, event) => event.data.result.prediction.topIntent === "Negative",

          },
          {
            target: 'success_agree_final_ask',
            cond: (context, event) => event.data.result.prediction.topIntent === "Affirmative",

          },
          {
            target: 'unrecognized_final_ask',
            cond: (context, event) => event.data.result.prediction.topIntent != "Affirmative" && event.data.result.prediction.topIntent != "Negative",
            actions: (context, event) => console.log(event.data.result)
          },
        ],
        onError: {
          target: 'failure_final_ask',
          actions: (context, event) => console.log(event.data)
        }
      }
    },
    unrecognized_final_ask: {
      entry: send((context) => ({
        type: "SPEAK",
        value: `Sorry, I didn't understand that.`,
      })),
      on: { ENDSPEECH: "final_ask" },
    },
    success_deny_final_ask: {
      entry: send((context) => ({
        type: "SPEAK",
        value: `OK, discarding`,
      })),
      on: { ENDSPEECH: "idle" },
    },
    success_agree_final_ask: {
      entry: send((context) => ({
        type: "SPEAK",
        value: `Your meeting as been created`,
      })),
      on: { ENDSPEECH: "idle" },
    },
    failure_final_ask: {
      entry: send((context) => ({
        type: "SPEAK",
        value: `I don't know who that is.`,
      })),
      on: { ENDSPEECH: "final_ask" },
    },
    info_final_time_ask: {
      invoke: {
        src: (context, event) => getIntents(context.decision),
        onDone: [
          {
            target: 'success_deny_final_time_ask',
            cond: (context, event) => event.data.result.prediction.topIntent === "Negative",

          },
          {
            target: 'success_agree_final_time_ask',
            cond: (context, event) => event.data.result.prediction.topIntent === "Affirmative",

          },
          {
            target: 'unrecognized_final_time_ask',
            cond: (context, event) => event.data.result.prediction.topIntent != "Affirmative" && event.data.result.prediction.topIntent != "Negative",
            actions: (context, event) => console.log(event.data.result)
          },
        ],
        onError: {
          target: 'failure_final_time_ask',
          actions: (context, event) => console.log(event.data)
        }
      }
    },
    unrecognized_final_time_ask: {
      entry: send((context) => ({
        type: "SPEAK",
        value: `Sorry, I didn't understand that.`,
      })),
      on: { ENDSPEECH: "final_time_ask" },
    },
    success_deny_final_time_ask: {
      entry: send((context) => ({
        type: "SPEAK",
        value: `OK, discarding`,
      })),
      on: { ENDSPEECH: "idle" },
    },
    success_agree_final_time_ask: {
      entry: send((context) => ({
        type: "SPEAK",
        value: `Your meeting as been created`,
      })),
      on: { ENDSPEECH: "idle" },
    },
    failure_final_time_ask: {
      entry: send((context) => ({
        type: "SPEAK",
        value: `I don't know who that is.`,
      })),
      on: { ENDSPEECH: "final_ask" },
    },
  },
};
