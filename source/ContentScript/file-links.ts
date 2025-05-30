import { waitForPageLoad } from './page-load';

export async function clickFileLink(button: HTMLButtonElement): Promise<void> {
  button.click();
  await waitForPageLoad();
}

export async function openFileLinksOnResultsPage(index: number): Promise<string[]> {
  const links: string[] = [];
  const table = document.querySelector<HTMLTableElement>('#NameResultsTable');
  if (!table) return links;

  const buttons = table.querySelectorAll<HTMLButtonElement>('button.ButtonAsLink[type="submit"]');
  if (index >= buttons.length) {
    throw new Error('No more files to process');
  }

  await clickFileLink(buttons[index]);
  return links;
} 