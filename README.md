[![Digabi logo](https://digabi.fi/images/digabi-logo.png)](https://digabi.fi) 

Digabi is a codebase used in the Abitti exam system, the digital exam environment for the [Finnish Matriculation Examination](https://www.ylioppilastutkinto.fi/en).

All bug reports, feature requests, and pull requests are appreciated. However, the following should be kept in mind:

* Pull requests based on submitted issues cannot be implemented due to limited resources. Similarly, upstream issues related to third-party projects in use are not forwarded.
* No guarantee can be given that submitted pull requests will be reviewed.
* Our focus is strictly on the Finnish Matriculation Examination, as defined by law. Issues or pull requests unrelated to this mission will not be addressed.
* Official channels should be used for inquiries. The issue tracker and pull requests are not to be used for general questions or support requests.

Before any contribution is accepted to the codebase, to clarify the intellectual property rights associated with contributions to open-source projects owned by the Finnish Matriculation Examination Board, all contributors must sign and submit a Contribution License Agreement (CLA):

* Individuals should sign and send the [Personal CLA](https://digabi.fi/YTL%20Personal%20CLA.pdf) to digabi@ylioppilastutkinto.fi.
* Organizations or corporations should sign and send the [Corporate CLA](https://digabi.fi/YTL%20Corporate%20CLA.pdf) to the same address.

# Digabi Exam Admin

Digabi Exam Admin is the codebase for the service to administer tests i.e. create
new tests, distribute tests, grade tests and send graded test answer to candidates
who participated in the tests. This source code is used in the service found at
[oma.abitti.fi](https://oma.abitti.fi/), but doesn't include the necessary
credentials to administer tests in that service.

The user interface has language support for Finnish and Swedish at the moment
(unfortunately not in English).

See [How to run it](#how-to-run-it) to make it run on the development environment.

### Test editor

Test editor produces xml formatted representation of the test. It is based on
given [exam schema](https://abitti.net/schema/exam.xsd). You can use either
a visual editor or raw code editor to compose your test. You can also copy questions
from other tests into edited one.

When editing you will always see the preview of the test on the right side.

There are also detailed instructions about composing test (in
[Finnish](https://www.abitti.fi/fi/ohjeet/kokeen-laatiminen/) and
[Swedish](https://www.abitti.fi/sv/anvisningar/skapa-prov/)), used for composing
tests at [oma.abitti.fi](https://oma.abitti.fi/).

# How to run it

You need Docker (or similar) container engine installed on your host machine.
The instructions below assume Docker.

1. When Docker engine is running, run `docker compose build` in the root of
the repository to build all containers (it will take some time to finish)
2. When containers has been built, run `docker compose up -d`
3. Open app in browser at http://localhost:9999
4. Use credentials `demo@example.com` / `demo`, or `superuser@example.com` / `superuser`
for full access.

**Note that you cannot compile this repository on the host machine at the moment.** Certain required files are generated as part of the image build process.

The initial setup contains one test having grading available. The test is not editable,
but you can create a copy of it and make edits to the copy.

## How to stop the development environment

1. Run `docker compose down` to stop all containers in the app
2. Optionally run `docker compose rm` to remove stopped containers.
