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
        program.plugins.add(new Plugin());
    });

    afterEach(() => {
        fsExtra.removeSync(tempDir);
    });

    it('adds a leading print statement to every named function', async () => {
        program.setFile('source/main.bs', `
            sub main()
                m.name = "main"
            end sub

            function temp()
                m.name = "temp"
            end function
        `);
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

        //make sure there are no diagnostics
        program.validate();
        expect(
            program.getDiagnostics().map(x => x.message)
        ).to.eql([]);

        //make sure the code transpiles properly
        expect(
            (await program.getTranspiledFileContents('source/main.bs')).code
        ).to.eql(undent`
            sub main()
                print "hello from main"
                m.name = "main"
            end sub

            function temp()
                print "hello from temp"
                m.name = "temp"
            end function
        `);



        expect(
            undent((await program.getTranspiledFileContents('components/CustomButton.xml')).code)
        ).to.eql(undent`
            <component name="CustomButton" extends="Button">
                <script type="text/brightscript" uri="CustomButton.brs" />
                <script type="text/brightscript" uri="pkg:/source/bslib.brs" />
                <children>
                    <label text="Hello from CustomButton" />
                </children>
            </component>
        `);

        expect(
            (await program.getTranspiledFileContents('components/CustomButton.brs')).code
        ).to.eql(undent`
            sub init()
                print "hello from init"
                m.name = "init"
            end sub
        `);
    });
});
