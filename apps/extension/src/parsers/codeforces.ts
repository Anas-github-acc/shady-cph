export interface CPTestcase {
  input: string;
  output: string;
}

export interface CPMetadata {
  platform: string;
  contestId?: string;
  problemIndex?: string;
  question_url?: string;
  problem_number?: string;
  contest_number?: string;
  label?: string;
}

export const codeforcesParser = {
  getMetadata: (): CPMetadata => {
    const url = window.location.href;
    let contestId = "";
    let problemIndex = "";

    if (url.includes("/contest/")) {
      const match = url.match(/contest\/(\d+)\/problem\/([A-Z\d]+)/);
      if (match) {
        contestId = match[1];
        problemIndex = match[2];
      }
    } else if (url.includes("/problemset/problem/")) {
      const match = url.match(/problemset\/problem\/(\d+)\/([A-Z\d]+)/);
      if (match) {
        contestId = match[1];
        problemIndex = match[2];
      }
    }

    return {
      platform: "codeforces",
      contestId,
      problemIndex,
      question_url: url,
      problem_number: problemIndex,
      contest_number: contestId,
      label: `${contestId}${problemIndex}`,
    };
  },

  getTestCases: (): CPTestcase[] => {
    const testCases: CPTestcase[] = [];
    const blocks = document.querySelectorAll(".sample-test");

    blocks.forEach((block) => {
      const inputs = block.querySelectorAll(".input pre");
      const outputs = block.querySelectorAll(".output pre");

      for (let i = 0; i < inputs.length; i++) {
        const inputEl = inputs[i] as HTMLElement;
        const outputEl = outputs[i] as HTMLElement;
        if (inputEl && outputEl) {
          testCases.push({
            input: inputEl.innerText.trim() + "\n",
            output: outputEl.innerText.trim() + "\n",
          });
        }
      }
    });

    return testCases;
  },
};
