import { Program, standardizePath as s } from 'brighterscript';
import * as fsExtra from 'fs-extra';
import { Plugin } from './Plugin';
import undent from 'undent';
import { expect } from 'chai';

describe('Plugin', () => {
    let program: Program;
    const tempDir = s`${__dirname}/../.tmp`;
    const rootDir = s`${tempDir}/rootDir`;
    const stagingDir = s`${tempDir}/stagingDir`;

    beforeEach(() => {
        fsExtra.emptyDirSync(rootDir);
        fsExtra.emptyDirSync(stagingDir);

        program = new Program({
            rootDir: rootDir,
            stagingDir: stagingDir
        });
        const plugin = new Plugin();
        program.plugins.add(plugin);
        //`afterProgramCreate` is only emitted by ProgramBuilder, not by Program, so a test that
        //builds a bare Program has to invoke it directly to get the plugin's lib files loaded.
        plugin.afterProgramCreate(program);
    });

    afterEach(() => {
        fsExtra.removeSync(tempDir);
    });

    it('injects the callfunc interface and reftracker lib script into components', async () => {
        program.setFile('components/CustomButton.xml', `
            <component name="CustomButton" extends="Button">
                <script type="text/brightscript" uri="CustomButton.brs" />
            </component>
        `);
        program.setFile('components/CustomButton.brs', `
            sub init()
                m.name = "init"
            end sub
        `);

        //the injected script and callfunc should resolve, so there should be no diagnostics
        program.validate();
        expect(
            program.getDiagnostics().map(x => x.message)
        ).to.eql([]);

        expect(
            undent((await program.getTranspiledFileContents('components/CustomButton.xml')).code)
        ).to.eql(undent`
            <component name="CustomButton" extends="Button">
                <interface>
                    <function name="reftracker_internal_execute" />
                </interface>
                <script type="text/brightscript" uri="CustomButton.brs" />
                <script type="text/brightscript" uri="pkg:/source/reftrackerLib.brs" />
                <script type="text/brightscript" uri="pkg:/source/roku_modules/reftracker_promises/promises.brs" />
                <script type="text/brightscript" uri="pkg:/source/bslib.brs" />
            </component>
        `);
    });

    it('preserves an existing interface when injecting the callfunc', async () => {
        program.setFile('components/HasInterface.xml', `
            <component name="HasInterface" extends="Group">
                <interface>
                    <field id="caption" type="string" />
                </interface>
                <script type="text/brightscript" uri="HasInterface.brs" />
            </component>
        `);
        program.setFile('components/HasInterface.brs', `
            sub init()
            end sub
        `);

        program.validate();
        expect(
            program.getDiagnostics().map(x => x.message)
        ).to.eql([]);

        const code = undent((await program.getTranspiledFileContents('components/HasInterface.xml')).code);
        //the pre-existing field survives...
        expect(code).to.include('<field id="caption" type="string" />');
        //...alongside the injected callfunc function
        expect(code).to.include('<function name="reftracker_internal_execute" />');
    });

    it('leaves brs files untouched', async () => {
        program.setFile('source/main.bs', `
            sub main()
                m.name = "main"
            end sub
        `);

        program.validate();
        expect(
            program.getDiagnostics().map(x => x.message)
        ).to.eql([]);

        expect(
            (await program.getTranspiledFileContents('source/main.bs')).code
        ).to.eql(undent`
            sub main()
                m.name = "main"
            end sub
        `);
    });
});
