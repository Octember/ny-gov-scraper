import { waitForPageLoad } from './page-load';

export async function clickFileButton(btn: HTMLButtonElement): Promise<void> {
  btn.click();
  await waitForPageLoad();
}

export async function clickFileLinksSequentially(buttons: NodeListOf<HTMLButtonElement>): Promise<void> {
  for (let i = 0; i < buttons.length; i += 1) {
    await clickFileButton(buttons[i]);
  }
}

export async function openFileLinksOnResultsPage(): Promise<string[]> {
  const links: string[] = [];
  const table = document.querySelector<HTMLTableElement>('#NameResultsTable');
  if (!table) return links;

  const buttons = table.querySelectorAll<HTMLButtonElement>('button.ButtonAsLink[type="submit"]');
  await clickFileLinksSequentially(buttons);
  return links;
} 