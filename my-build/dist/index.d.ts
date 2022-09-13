interface BuildOptions {
    inpurt: string;
}
declare function build(options: BuildOptions): Promise<{
    generate: () => {
        code: string;
    };
}>;

export { BuildOptions, build };
