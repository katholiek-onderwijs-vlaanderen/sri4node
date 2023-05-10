// needed for express-middleware-timer to actually do something !!!
// And it must be set before importing ./js/common !!!
process.env.TIMER = 'true';

const helloWorld = () => console.log('hello')

export {
  helloWorld
}