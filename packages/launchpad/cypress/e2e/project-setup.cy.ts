import { FRONTEND_FRAMEWORKS, BUNDLERS, ComponentDep, FrontendVariant, CODE_LANGUAGES } from '@packages/types/src/constants'

describe('Launchpad: Setup Project', () => {
  function scaffoldAndOpenProject (name: Parameters<typeof cy.scaffoldProject>[0], args?: Parameters<typeof cy.openProject>[1]) {
    cy.scaffoldProject(name)
    cy.openProject(name, args)
  }

  const verifyWelcomePage = ({ e2eIsConfigured, ctIsConfigured }) => {
    cy.contains('Welcome to Cypress!').should('be.visible')
    cy.contains('[data-cy-testingtype="e2e"]', e2eIsConfigured ? 'Configured' : 'Not Configured')
    cy.contains('[data-cy-testingtype="component"]', ctIsConfigured ? 'Configured' : 'Not Configured')
  }

  it('no initial setup displays welcome page', () => {
    scaffoldAndOpenProject('pristine')
    cy.visitLaunchpad()
    cy.contains('Welcome to Cypress!').should('be.visible')
    verifyWelcomePage({ e2eIsConfigured: false, ctIsConfigured: false })
  })

  describe('"learn about testing types" modal', () => {
    beforeEach(() => {
      scaffoldAndOpenProject('pristine')
      cy.visitLaunchpad()
      verifyWelcomePage({ e2eIsConfigured: false, ctIsConfigured: false })
    })

    it('welcome page has "learn about testing types" link which opens modal', () => {
      cy.contains('Review the differences').click()

      cy.get('#app').should('have.attr', 'aria-hidden', 'true')

      cy.findByRole('dialog', { name: 'Key Differences' }).should('be.visible')
      cy.contains('Need help').should('be.visible')

      cy.get('[data-cy="end-to-end-comparison"]').within(() => {
        cy.contains('End-to-end Tests').should('be.visible')
        cy.get('li').should('have.length', 3)
        cy.contains('Code Example').should('be.visible')
      })

      cy.get('[data-cy="component-comparison"]').within(() => {
        cy.contains('Component Tests').should('be.visible')
        cy.get('li').should('have.length', 3)
        cy.contains('Code Example').should('be.visible')
      })
    })

    it('close modal with escape key', () => {
      cy.contains('Review the differences').click()
      cy.get('#app').should('have.attr', 'aria-hidden', 'true')

      cy.findByRole('dialog', { name: 'Key Differences' })
      .as('aboutTestingTypes')
      .should('be.visible')

      cy.get('body').type('{esc}')
      cy.get('#app').should('not.have.attr', 'aria-hidden')
      cy.get('@aboutTestingTypes').should('not.exist')
    })

    it('closes modal by clicking outside of modal', () => {
      cy.contains('Review the differences').click()
      cy.get('#app').should('have.attr', 'aria-hidden', 'true')

      cy.findByRole('dialog', { name: 'Key Differences' })
      .as('aboutTestingTypes')
      .should('be.visible')

      cy.get('body').click(5, 5)
      cy.get('#app').should('not.have.attr', 'aria-hidden')
      cy.get('@aboutTestingTypes').should('not.exist')
    })

    it('closes modal by clicking close button', () => {
      cy.contains('Review the differences').click()
      cy.get('#app').should('have.attr', 'aria-hidden', 'true')

      cy.findByRole('dialog', { name: 'Key Differences' })
      .as('aboutTestingTypes')
      .should('be.visible')
      .within(() => {
        cy.get('h2').contains('Key Differences').should('be.visible')
      })

      cy.findByRole('button', { name: 'Close' }).click()
      cy.get('#app').should('not.have.attr', 'aria-hidden')
      cy.get('@aboutTestingTypes').should('not.exist')
    })

    // Cypress enter key down isn't trigger close callback. Working correctly when manually tested
    // or when using the cypress-real-evens plugin.
    // Could be related to this bug? https://github.com/cypress-io/cypress/issues/14864
    // FIXME: https://github.com/cypress-io/cypress/pull/19726
    it.skip('closes modal by pressing enter key when close button is focused', () => {
      cy.contains('Review the differences').click()
      cy.get('#app').should('have.attr', 'aria-hidden', 'true')

      cy.findByRole('dialog', { name: 'Key Differences' })
      .as('aboutTestingTypes')
      .should('be.visible')
      .within(() => {
        cy.get('h2').contains('Key Differences').should('be.visible')

        cy.tabUntil((el) => el.text().includes('Close'))

        cy.findByRole('button', { name: 'Close' })
        .should('have.focus')
        .type('{enter}')
      })

      cy.get('#app').should('not.have.attr', 'aria-hidden')
      cy.get('@aboutTestingTypes').should('not.exist')
    })

    it('clicking "Need Help?" links to Cypress documentation', () => {
      cy.contains('Review the differences').click()
      cy.get('#app').should('have.attr', 'aria-hidden', 'true')

      cy.findByRole('dialog', { name: 'Key Differences' })
      .should('be.visible')
      .within(() => {
        cy.validateExternalLink({
          name: 'Need help',
          href: 'https://on.cypress.io',
        })
      })
    })
  })

  describe('E2E test setup', () => {
    describe('project has been configured for e2e', () => {
      it('skips the setup page when choosing e2e tests to run', () => {
        scaffoldAndOpenProject('pristine-with-e2e-testing')
        cy.visitLaunchpad()

        verifyWelcomePage({ e2eIsConfigured: true, ctIsConfigured: true })

        cy.get('[data-cy-testingtype="e2e"]').click()

        cy.contains(/(Initializing Config|Choose a Browser)/, { timeout: 10000 })
      })

      it('opens to the browser pages when opened via cli with --e2e flag', () => {
        scaffoldAndOpenProject('pristine-with-e2e-testing', ['--e2e'])
        cy.visitLaunchpad()

        cy.get('h1').should('contain', 'Choose a Browser')
      })
    })

    // project has a cypress.configuration file with component testing configured
    describe('project that has not been configured for e2e', () => {
      // FIXME: ProjectLifecycleManager is skipping straight to browser pages when it should show setup page.
      it.skip('shows the configuration setup page when selecting e2e tests', () => {
        scaffoldAndOpenProject('pristine-with-ct-testing')
        cy.visitLaunchpad()

        verifyWelcomePage({ e2eIsConfigured: false, ctIsConfigured: true })

        cy.get('[data-cy-testingtype="e2e"]').click()

        cy.contains('h1', 'Configuration Files')
        cy.findByText('We added the following files to your project.')

        cy.get('[data-cy=changes]').within(() => {
          cy.contains('cypress.config.js')
        })

        cy.get('[data-cy=valid]').within(() => {
          cy.containsPath('cypress/support/e2e.js')
          cy.containsPath('cypress/fixtures/example.json')
        })
      })

      // FIXME: ProjectLifecycleManager is skipping straight to browser pages when it should show setup page.
      it.skip('moves to "Choose a Browser" page after clicking "Continue" button in first step in configuration page', () => {
        scaffoldAndOpenProject('pristine-with-ct-testing')
        cy.visitLaunchpad()

        verifyWelcomePage({ e2eIsConfigured: false, ctIsConfigured: true })

        cy.get('[data-cy-testingtype="e2e"]').click()

        cy.contains('h1', 'Configuration Files')
        cy.findByText('We added the following files to your project.')

        cy.get('[data-cy=changes]').within(() => {
          cy.contains('cypress.config.js')
        })

        cy.get('[data-cy=valid]').within(() => {
          cy.containsPath('cypress/support/e2e.js')
          cy.containsPath('cypress/fixtures/example.json')
        })
      })

      it('shows the configuration setup page when opened via cli with --e2e flag', () => {
        scaffoldAndOpenProject('pristine-with-ct-testing', ['--e2e'])
        cy.visitLaunchpad()

        cy.contains('h1', 'Configuration Files')
        cy.contains('We added the following files to your project.')

        cy.get('[data-cy=changes]').within(() => {
          cy.contains('cypress.config.js')
        })

        cy.get('[data-cy=valid]').within(() => {
          cy.containsPath('cypress/support/e2e.js')
          cy.containsPath('cypress/fixtures/example.json')
        })
      })
    })

    describe('project not been configured for cypress', () => {
      it('can go back before selecting e2e scaffold lang', () => {
        scaffoldAndOpenProject('pristine')
        cy.visitLaunchpad()

        verifyWelcomePage({ e2eIsConfigured: false, ctIsConfigured: false })

        cy.tabUntil((el) => {
          return el.text().includes('E2E Testing')
        })

        cy.contains('button', 'E2E Testing')
        .should('have.focus')
        .realPress('Enter')

        cy.contains('h1', 'Project Setup')
        cy.findByRole('button', { name: 'Back' }).click()

        verifyWelcomePage({ e2eIsConfigured: false, ctIsConfigured: false })
      })

      it('can setup e2e testing for a project selecting JS', () => {
        scaffoldAndOpenProject('pristine')
        cy.visitLaunchpad()

        verifyWelcomePage({ e2eIsConfigured: false, ctIsConfigured: false })

        cy.tabUntil((el) => el.text().includes('E2E Testing'))

        cy.contains('button', 'E2E Testing')
        .should('have.focus')
        .realPress('Enter')

        cy.contains('h1', 'Project Setup')
        cy.findByRole('button', { name: 'JavaScript' }).click()
        cy.findByRole('button', { name: 'Next Step' }).click()

        cy.contains('h1', 'Configuration Files')
        cy.findByText('We added the following files to your project.')

        cy.get('[data-cy=valid]').within(() => {
          cy.contains('cypress.config.js')
          cy.containsPath('cypress/support/e2e.js')
          cy.containsPath('cypress/fixtures/example.json')
        })

        cy.findByRole('button', { name: 'Continue' })
        .should('not.have.disabled')
        .click()

        cy.contains(/(Initializing Config|Choose a Browser)/, { timeout: 10000 })
      })

      it('can setup e2e testing for a project selecting TS', () => {
        scaffoldAndOpenProject('pristine')
        cy.visitLaunchpad()

        verifyWelcomePage({ e2eIsConfigured: false, ctIsConfigured: false })

        cy.tabUntil((el) => el.text().includes('E2E Testing'))

        cy.contains('button', 'E2E Testing')
        .should('have.focus')
        .realPress('Enter')

        cy.contains('h1', 'Project Setup')
        cy.findByRole('button', { name: 'TypeScript' }).click()
        cy.findByRole('button', { name: 'Next Step' }).click()

        cy.contains('h1', 'Configuration Files')
        cy.findByText('We added the following files to your project.')

        cy.get('[data-cy=valid]').within(() => {
          cy.contains('cypress.config.ts')
          cy.containsPath('cypress/support/e2e.ts')
          cy.containsPath('cypress/fixtures/example.json')
        })
      })

      it('can setup e2e testing for a project selecting TS when CT is configured and config file is JS', () => {
        scaffoldAndOpenProject('pristine-with-ct-testing')
        cy.visitLaunchpad()

        verifyWelcomePage({ e2eIsConfigured: false, ctIsConfigured: true })

        cy.tabUntil((el) => el.text().includes('E2E Testing'))

        cy.contains('button', 'E2E Testing')
        .should('have.focus')
        .realPress('Enter')

        cy.contains('h1', 'Project Setup')
        cy.findByRole('button', { name: 'TypeScript' }).click()
        cy.findByRole('button', { name: 'Next Step' }).click()

        cy.contains('h1', 'Configuration Files')
        cy.findByText('We added the following files to your project.')

        cy.get('[data-cy=changes]').within(() => {
          cy.contains('cypress.config.js')
        })

        cy.get('[data-cy=valid]').within(() => {
          cy.containsPath('cypress/support/e2e.ts')
          cy.containsPath('cypress/fixtures/example.json')
        })
      })

      it('can setup CT testing for a project selecting TS when E2E is configured and config file is JS', () => {
        scaffoldAndOpenProject('pristine-with-e2e-testing')
        cy.visitLaunchpad()

        verifyWelcomePage({ e2eIsConfigured: true, ctIsConfigured: false })

        cy.contains('button', 'Component Testing')
        .focus()
        .realPress('Enter')

        cy.findByText('Confirm the front-end framework and bundler used in your project.')

        cy.findByRole('button', { name: 'Front-end Framework Pick a framework' }).click()
        cy.findByRole('option', { name: 'Create React App' }).click()

        cy.get('[data-testid="select-bundler"').should('not.exist')
        cy.findByRole('button', { name: 'Next Step' }).should('not.have.disabled')

        cy.findByRole('button', { name: 'Back' }).click()
        cy.get('[data-cy-testingtype="component"]').click()

        cy.findByRole('button', { name: 'Front-end Framework Pick a framework' }).click()
        cy.findByRole('option', { name: 'React.js' }).click()

        cy.findByRole('button', { name: 'Next Step' }).should('have.disabled')

        cy.findByRole('button', { name: 'Bundler(Dev Server) Pick a bundler' }).click()
        cy.findByRole('option', { name: 'Webpack' }).click()
        cy.findByRole('button', { name: 'Next Step' }).should('not.have.disabled')

        cy.findByRole('button', { name: 'Front-end Framework React.js' }).click()
        cy.findByRole('option', { name: 'Create React App' }).click()
        cy.findByRole('button', { name: 'Bundler(Dev Server) Webpack' }).should('not.exist')
        cy.findByRole('button', { name: 'Next Step' }).should('not.have.disabled')

        cy.findByRole('button', { name: 'TypeScript' }).click()

        let calls = 0

        // simulate progressive installation of modules
        cy.intercept('query-Wizard_InstalledPackages', (req) => {
          req.reply({ data: {
            wizard: {
              __typename: 'Wizard',
              installedPackages: ++calls <= 2 ? [] :
                calls <= 3 ? ['@cypress/react'] :
                  ['@cypress/react', '@cypress/webpack-dev-server', 'webpack', 'webpack-dev-server', 'html-webpack-plugin'],
            },
          } })
        }).as('InstalledPackages')

        cy.findByRole('button', { name: 'Next Step' }).click()
        cy.findByRole('button', { name: 'Waiting for you to install the dependencies...' })

        cy.wait('@InstalledPackages')

        cy.contains('li', '@cypress/react').findByLabelText('installed').should('be.visible')

        cy.wait('@InstalledPackages')
        cy.contains('li', '@cypress/webpack-dev-server').findByLabelText('installed').should('be.visible').then(() => {
          expect(calls).to.eq(4)
        })

        cy.findByRole('button', { name: 'Continue' }).click()

        cy.get('[data-cy=changes]').within(() => {
          cy.contains('cypress.config.js')
        })

        cy.get('[data-cy=valid]').within(() => {
          cy.containsPath('cypress/component/index.html')
          cy.containsPath('cypress/support/component.ts')
        })

        cy.findByRole('button', { name: 'Continue' }).should('have.disabled')
      })

      it('shows the configuration setup page when opened via cli with --e2e flag', () => {
        scaffoldAndOpenProject('pristine-with-ct-testing', ['--e2e'])
        cy.visitLaunchpad()

        cy.contains('h1', 'Configuration Files')
        cy.contains('We added the following files to your project.')

        cy.get('[data-cy=changes]').within(() => {
          cy.contains('cypress.config.js')
        })

        cy.get('[data-cy=valid]').within(() => {
          cy.containsPath('cypress/support/e2e.js')
          cy.containsPath('cypress/fixtures/example.json')
        })
      })

      it('can reconfigure config after CT has been set up', () => {
        scaffoldAndOpenProject('pristine-with-ct-testing')
        cy.withCtx((ctx) => {
          ctx.coreData.forceReconfigureProject = {
            component: true,
          }
        })

        cy.visitLaunchpad()

        verifyWelcomePage({ e2eIsConfigured: false, ctIsConfigured: true })

        cy.get('[data-cy-testingtype="component"]').click()

        cy.contains('Project Setup')
      })

      it('can reconfigure config after e2e has been set up', () => {
        scaffoldAndOpenProject('pristine-with-e2e-testing')
        cy.withCtx((ctx) => {
          ctx.coreData.forceReconfigureProject = {
            e2e: true,
          }
        })

        cy.visitLaunchpad()

        verifyWelcomePage({ e2eIsConfigured: true, ctIsConfigured: false })

        cy.get('[data-cy-testingtype="e2e"]').click()

        cy.contains('Project Setup')
      })

      it('can move forward to choose browser if e2e is configured and is selected from the dropdown list', () => {
        cy.openProject('pristine-with-e2e-testing')
        cy.visitLaunchpad()

        verifyWelcomePage({ e2eIsConfigured: true, ctIsConfigured: false })

        cy.get('[data-cy-testingtype="e2e"]').within(() => {
          cy.get('[data-cy=status-badge-menu]').click()
          cy.get('[data-cy="Choose a Browser"]').click()
        })

        cy.contains('Choose a Browser')
        cy.contains('Choose your preferred browser for E2E testing.')
      })

      it('can reconfigure config from the testing type card selecting E2E', () => {
        cy.openProject('pristine-with-e2e-testing')
        cy.visitLaunchpad()

        verifyWelcomePage({ e2eIsConfigured: true, ctIsConfigured: false })

        cy.get('[data-cy-testingtype="component"]').within(() => {
          cy.contains('Not Configured')
        })

        cy.get('[data-cy-testingtype="e2e"]').within(() => {
          cy.get('[data-cy=status-badge-menu]').click()
          cy.get('[data-cy="Reconfigure"]').click()
        })

        cy.contains('Project Setup')
      })

      it('can move forward to choose browser if component is configured and is selected from the dropdown list', () => {
        cy.openProject('pristine-with-ct-testing')
        cy.visitLaunchpad()

        verifyWelcomePage({ e2eIsConfigured: false, ctIsConfigured: true })

        cy.get('[data-cy-testingtype="component"]').within(() => {
          cy.get('[data-cy=status-badge-menu]').click()
          cy.get('[data-cy="Choose a Browser"]').click()
        })

        cy.contains('Choose a Browser')
      })

      it('can reconfigure config from the testing type card selecting Component', () => {
        cy.openProject('pristine-with-ct-testing')
        cy.visitLaunchpad()

        verifyWelcomePage({ e2eIsConfigured: false, ctIsConfigured: true })

        cy.get('[data-cy-testingtype="e2e"]').within(() => {
          cy.contains('Not Configured')
        })

        cy.get('[data-cy-testingtype="component"]').within(() => {
          cy.get('[data-cy=status-badge-menu]').click()
          cy.get('[data-cy="Reconfigure"]').click()
        })

        cy.contains('Project Setup')
      })
    })
  })

  describe('Component setup', () => {
    describe('project has been configured for component testing', () => {
      it('skips the setup steps when choosing component tests to run', () => {
        scaffoldAndOpenProject('pristine-with-ct-testing')
        cy.visitLaunchpad()

        verifyWelcomePage({ e2eIsConfigured: false, ctIsConfigured: true })

        cy.get('[data-cy-testingtype="component"]').click()

        cy.contains(/(Initializing Config|Choose a Browser)/, { timeout: 10000 })
      })

      it('opens to the browser pages when opened via cli with --component flag', () => {
        scaffoldAndOpenProject('pristine-with-ct-testing', ['--component'])
        cy.visitLaunchpad()

        cy.get('h1').should('contain', 'Choose a Browser')
      })
    })

    describe('project that has not been configured for component testing', () => {
      beforeEach(() => {
        // simulate installation of modules
        cy.intercept('query-Wizard_InstalledPackages', (req) => {
          req.reply({ data: {
            wizard: {
              __typename: 'Wizard',
              installedPackages: [
                '@cypress/react',
                '@cypress/vue',
                '@cypress/webpack-dev-server',
                '@cypress/vite-dev-server',
                '@storybook/testing-react',
                '@storybook/testing-vue',
                '@storybook/testing-vue3',
              ],
            },
          } })
        }).as('InstalledPackages')
      })

      it('shows the first setup page for configuration when selecting component tests', () => {
        scaffoldAndOpenProject('pristine-with-e2e-testing')
        cy.visitLaunchpad()

        verifyWelcomePage({ e2eIsConfigured: true, ctIsConfigured: false })

        cy.get('[data-cy-testingtype="component"]').click()

        cy.get('h1').should('contain', 'Project Setup')
        cy.contains('Confirm the front-end framework and bundler used in your project.')

        cy.findByRole('button', {
          name: 'Front-end Framework Pick a framework',
          expanded: false,
        })
        .should('have.attr', 'aria-haspopup', 'true')

        cy.findByRole('button', { name: 'Next Step' }).should('have.disabled')

        cy.findByRole('button', { name: 'Back' }).click()

        verifyWelcomePage({ e2eIsConfigured: true, ctIsConfigured: false })
      })

      const STORYBOOK_PERMUTATIONS = [false, true]

      FRONTEND_FRAMEWORKS.forEach((framework) => {
        framework.variants.forEach((variant: FrontendVariant, i) => {
          CODE_LANGUAGES.forEach((lang) => {
            STORYBOOK_PERMUTATIONS.forEach((testStorybook) => {
              if (testStorybook && !variant.supportsStorybook) {
                return
              }

              // Different languages only affect generated files that don't currently
              // change with variants so we don't need to test against every variant
              if (lang.type === 'ts' && i !== 0) {
                return
              }

              let title = `${variant.name} + ${lang.name}${testStorybook ? ' + Storybook' : ''}`

              const bundler = BUNDLERS.find((bundler) => bundler.type === variant.bundler)

              if (!bundler) {
                throw new Error(`${framework.name} claims to support the bundler, ${variant.bundler}, however it is not a valid Cypress bundler.`)
              }

              const deps = (variant.supportsStorybook && testStorybook)
                ? [...variant.depsToInstall, framework.storybookDep]
                : variant.depsToInstall

              const installedPackages = [...deps].map((dep) => dep.name)

              const packageJson = JSON.stringify({ dependencies: [...variant.deps].reduce((acc, dep) => ({ ...acc, ...dep.example }), {}) })

              it(title, () => {
                scaffoldAndOpenProject(testStorybook ? 'pristine-with-e2e-testing-and-storybook' : 'pristine-with-e2e-testing')

                cy.withCtx(async (ctx, { packageJson }) => {
                  // @ts-ignore sinon is a global in the node process where this is executed
                  sinon.stub(ctx.actions.wizard, 'initialize')
                  await ctx.actions.file.writeFileInProject('package.json', packageJson)
                }, { packageJson })

                cy.intercept('query-Wizard_InstalledPackages', { data: { wizard: { __typename: 'Wizard', installedPackages } } })

                cy.visitLaunchpad()

                verifyWelcomePage({ e2eIsConfigured: true, ctIsConfigured: false })

                cy.get('[data-cy-testingtype="component"]').click()

                cy.log('Choose project setup')

                cy.get('h1').should('contain', 'Project Setup')
                cy.contains('Confirm the front-end framework and bundler used in your project.')
                cy.findByRole('button', { name: 'Next Step' })
                .should('have.disabled')
                .as('nextStepButton')

                cy.findByRole('button', {
                  name: 'Front-end Framework Pick a framework',
                  expanded: false,
                })
                .click()

                cy.findByRole('option', { name: framework.name }).click()
                cy.findByRole('button', { name: `Front-end Framework ${framework.name}` }) // ensure selected option updates

                if (framework.supportedBundlers.length > 1) {
                  cy.findByRole('button', {
                    name: 'Bundler(Dev Server) Pick a bundler',
                    expanded: false,
                  })
                  .should('have.attr', 'aria-haspopup', 'true')
                  .click()
                  .should('have.attr', 'aria-expanded', 'true')

                  framework.supportedBundlers.forEach((supportedBundler) => {
                    cy.findByRole('option', { name: Cypress._.startCase(supportedBundler) })
                    .find('svg')
                    .should('have.attr', 'data-cy', `${Cypress._.lowerCase(supportedBundler)}-logo`)
                  })

                  cy.findByRole('option', { name: bundler.name })
                  .find('svg')
                  .should('have.attr', 'data-cy', `${Cypress._.lowerCase(variant.bundler)}-logo`)
                  .click()

                  cy.findByRole('button', { name: `Bundler(Dev Server) ${bundler.name}` }) // ensure selected option updates
                }

                cy.findByRole('button', { name: lang.name }).click()

                cy.log('Go to next step')

                cy.get('@nextStepButton').should('not.have.disabled').click()

                cy.contains('h1', 'Install Dev Dependencies')
                cy.contains('p', 'Paste the command below into your terminal to install the required packages.')

                cy.log('Return to previous step')
                cy.findByRole('button', { name: 'Back' })
                .click()

                cy.findByRole('button', { name: `Front-end Framework ${framework.name}` })
                if (framework.supportedBundlers.length > 1) {
                  cy.findByRole('button', { name: `Bundler(Dev Server) ${bundler.name}` })
                }

                cy.findByRole('button', { name: lang.name })
                cy.findByRole('button', { name: 'Next Step' }).click()

                cy.log('Go to next step and verify Install Dev Dependencies page')
                cy.contains('h1', 'Install Dev Dependencies')

                const installCommand = `npm install -D ${deps.map((dep) => dep.package).join(' ')}`

                cy.contains('code', installCommand)

                const validatePackage = (dep: ComponentDep) => {
                  cy.validateExternalLink({
                    name: dep.package,
                    href: `https://www.npmjs.com/package/${dep.name}`,
                  })

                  cy.contains(dep.description.split('<span')[0])
                }

                deps.forEach((dep) => validatePackage(dep))

                cy.findByRole('button', { name: 'Continue' }).click()

                // Even if user chooses typescript in the previous
                // step, they already have a config file in js.
                // We cannot rename this file for them.
                cy.contains('[data-cy=changes]', `cypress.config.js`)

                cy.get('[data-cy=valid]').within(() => {
                  cy.containsPath('cypress/component/index.html')
                  cy.containsPath(`cypress/support/component.${lang.type}`)
                  cy.containsPath('cypress/fixtures/example.json')
                })
              })
            })
          })
        })
      })

      it('opens to the "choose framework" page when opened via cli with --component flag', () => {
        scaffoldAndOpenProject('pristine-with-e2e-testing', ['--component'])
        cy.visitLaunchpad()

        cy.get('h1').should('contain', 'Project Setup')
        cy.contains('Confirm the front-end framework and bundler used in your project.')
      })
    })

    describe('project not been configured for cypress', () => {
      beforeEach(() => {
        // simulate installation of modules
        cy.intercept('query-Wizard_InstalledPackages', (req) => {
          req.reply({ data: {
            wizard: {
              __typename: 'Wizard',
              installedPackages: [
                '@cypress/react',
                '@cypress/vue',
                '@cypress/webpack-dev-server',
                '@cypress/vite-dev-server',
                '@storybook/testing-react',
                '@storybook/testing-vue',
                '@storybook/testing-vue3',
                'webpack',
                'webpack-dev-server',
                'html-webpack-plugin',
              ],
            },
          } })
        }).as('InstalledPackages')
      })

      it('can setup component testing', () => {
        scaffoldAndOpenProject('pristine')
        cy.visitLaunchpad()

        verifyWelcomePage({ e2eIsConfigured: false, ctIsConfigured: false })

        cy.contains('button', 'Component Testing')
        .focus()
        .realPress('Enter')

        cy.findByText('Confirm the front-end framework and bundler used in your project.')

        cy.findByRole('button', { name: 'Front-end Framework Pick a framework' }).click()
        cy.findByRole('option', { name: 'Create React App' }).click()

        cy.get('[data-testid="select-bundler"').should('not.exist')
        cy.findByRole('button', { name: 'Next Step' }).should('not.have.disabled')

        cy.findByRole('button', { name: 'Back' }).click()
        cy.get('[data-cy-testingtype="component"]').click()

        cy.findByRole('button', { name: 'Front-end Framework Pick a framework' }).click()
        cy.findByRole('option', { name: 'React.js' }).click()

        cy.findByRole('button', { name: 'Next Step' }).should('have.disabled')

        cy.findByRole('button', { name: 'Bundler(Dev Server) Pick a bundler' }).click()
        cy.findByRole('option', { name: 'Webpack' }).click()

        cy.findByRole('button', { name: 'TypeScript' }).click()
        cy.findByRole('button', { name: 'Next Step' }).should('not.have.disabled')

        cy.findByRole('button', { name: 'Front-end Framework React.js' }).click()
        cy.findByRole('option', { name: 'Create React App' }).click()
        cy.findByRole('button', { name: 'Bundler(Dev Server) Webpack' }).should('not.exist')
        cy.findByRole('button', { name: 'Next Step' }).should('not.have.disabled')

        cy.findByRole('button', { name: 'Next Step' }).click()
        cy.findByRole('button', { name: 'Continue' }).click()

        cy.get('[data-cy=valid]').within(() => {
          cy.contains('cypress.config.ts')
          cy.containsPath('cypress/component/index.html')
          cy.containsPath(`cypress/support/component.ts`)
          cy.containsPath('cypress/fixtures/example.json')
        })

        cy.findByRole('button', { name: 'Continue' }).click()
        cy.contains(/(Initializing Config|Choose a Browser)/, { timeout: 10000 })
      })

      it('setup component testing with typescript files', () => {
        scaffoldAndOpenProject('pristine')
        cy.visitLaunchpad()

        verifyWelcomePage({ e2eIsConfigured: false, ctIsConfigured: false })

        cy.contains('button', 'Component Testing')
        .focus()
        .realPress('Enter')

        cy.findByText('Confirm the front-end framework and bundler used in your project.')

        cy.findByRole('button', { name: 'Front-end Framework Pick a framework' }).click()
        cy.findByRole('option', { name: 'Create React App' }).click()
        cy.findByRole('button', { name: 'TypeScript' }).click()
        cy.findByRole('button', { name: 'Next Step' }).click()
        cy.findByRole('button', { name: 'Continue' }).click()

        cy.get('[data-cy=valid]').within(() => {
          cy.contains('cypress.config.ts')
          cy.containsPath('cypress/component/index.html')
          cy.containsPath(`cypress/support/component.ts`)
          cy.containsPath('cypress/fixtures/example.json')
        })

        cy.findByRole('button', { name: 'Continue' }).click()
        cy.contains(/(Initializing Config|Choose a Browser)/, { timeout: 10000 })
      })
    })
  })

  describe('Command for package managers', () => {
    it('makes the right command for yarn', () => {
      scaffoldAndOpenProject('pristine-yarn')

      cy.visitLaunchpad()

      cy.get('[data-cy-testingtype="component"]').click()
      cy.get('[data-testid="select-framework"]').click()
      cy.findByText('Create React App').click()
      cy.findByText('Next Step').click()
      cy.get('code').should('contain.text', 'yarn add -D ')
    })

    it('makes the right command for pnpm', () => {
      scaffoldAndOpenProject('pristine-pnpm')

      cy.visitLaunchpad()

      cy.get('[data-cy-testingtype="component"]').click()
      cy.get('[data-testid="select-framework"]').click()
      cy.findByText('Create React App').click()
      cy.findByText('Next Step').click()
      cy.get('code').should('contain.text', 'pnpm install -D ')
    })

    it('makes the right command for npm', () => {
      scaffoldAndOpenProject('pristine-npm')

      cy.visitLaunchpad()

      cy.get('[data-cy-testingtype="component"]').click()
      cy.get('[data-testid="select-framework"]').click()
      cy.findByText('Create React App').click()
      cy.findByText('Next Step').click()
      cy.get('code').should('contain.text', 'npm install -D ')
    })
  })

  describe('detect framework, bundler and language', () => {
    beforeEach(() => {
      scaffoldAndOpenProject('pristine')
    })

    context('meta frameworks', () => {
      it('detects CRA framework', () => {
        cy.withCtx(async (ctx) => {
          await ctx.actions.file.writeFileInProject('package.json', `
          {
            "dependencies": {
              "react": "^1.0.0",
              "react-dom": "^1.0.1",
              "react-scripts": "1.0.0"
            }
          }
        `)
        })

        cy.visitLaunchpad()

        cy.get('[data-cy-testingtype="component"]').click()
        cy.get('[data-testid="select-framework"]').findByText('Create React App').should('be.visible')
      })

      it('detects Next framework', () => {
        cy.withCtx(async (ctx) => {
          await ctx.actions.file.writeFileInProject('package.json', `
          {
            "dependencies": {
              "react": "^1.0.0",
              "react-dom": "^1.0.1",
              "next": "1.0.0"
            }
          }
        `)
        })

        cy.visitLaunchpad()

        cy.get('[data-cy-testingtype="component"]').click()
        cy.get('[data-testid="select-framework"]').findByText('Next.js').should('be.visible')
      })

      it('detects vue-cli framework', () => {
        cy.withCtx(async (ctx) => {
          await ctx.actions.file.writeFileInProject('package.json', `
          {
            "dependencies": {
              "vue": "^1.0.0",
              "@vue/cli-service": "^1.0.1"
            }
          }
        `)
        })

        cy.visitLaunchpad()

        cy.get('[data-cy-testingtype="component"]').click()
        cy.get('[data-testid="select-framework"]').findByText('Vue CLI').should('be.visible')
      })

      it('detects nuxtjs framework', () => {
        cy.withCtx(async (ctx) => {
          await ctx.actions.file.writeFileInProject('package.json', `
          {
            "dependencies": {
              "vue": "^1.0.0",
              "nuxt": "^1.0.1"
            }
          }
        `)
        })

        cy.visitLaunchpad()

        cy.get('[data-cy-testingtype="component"]').click()
        cy.get('[data-testid="select-framework"]').findByText('Nuxt.js').should('be.visible')
      })
    })

    context('pure frameworks', () => {
      it('detects react framework', () => {
        cy.withCtx(async (ctx) => {
          await ctx.actions.file.writeFileInProject('package.json', `
          {
            "dependencies": {
              "react": "^1.0.0"
            }
          }
        `)
        })

        cy.visitLaunchpad()

        cy.get('[data-cy-testingtype="component"]').click()
        cy.get('[data-testid="select-framework"]').findByText('React.js').should('be.visible')
      })

      it('detects vue framework', () => {
        cy.withCtx(async (ctx) => {
          await ctx.actions.file.writeFileInProject('package.json', `
          {
            "dependencies": {
              "vue": "^1.0.0"
            }
          }
        `)
        })

        cy.visitLaunchpad()

        cy.get('[data-cy-testingtype="component"]').click()
        cy.get('[data-testid="select-framework"]').findByText('Vue.js').should('be.visible')
      })
    })

    describe('bundlers', () => {
      it('detects webpack framework', () => {
        cy.withCtx(async (ctx) => {
          await ctx.actions.file.writeFileInProject('package.json', `
          {
            "dependencies": {
              "react": "^1.0.0",
              "webpack": "^1.0.0"
            }
          }
        `)
        })

        cy.visitLaunchpad()

        cy.get('[data-cy-testingtype="component"]').click()
        cy.get('[data-testid="select-bundler"]').findByText('Webpack').should('be.visible')
      })

      it('detects vite framework', () => {
        cy.withCtx(async (ctx) => {
          await ctx.actions.file.writeFileInProject('package.json', `
          {
            "dependencies": {
              "react": "^1.0.0",
              "vite": "^1.0.0"
            }
          }
        `)
        })

        cy.visitLaunchpad()

        cy.get('[data-cy-testingtype="component"]').click()
        cy.get('[data-testid="select-bundler"]').findByText('Vite').should('be.visible')
      })
    })
  })
})
