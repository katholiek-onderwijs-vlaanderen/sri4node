declare function instrument(middleware: any, name: any): any;
declare function calculate(req: any, res: any): {
    request: {
        url: any;
        headers: any;
    };
    timers: {
        startup: {
            from_start: number;
        };
    };
};
declare function init(reporter: any): (req: any, res: any, next: any) => any;
export { instrument, init, calculate, };
