import { expect, test } from "@playwright/test";

test("public page shows tagline and sign-in button", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByText("Borrow what you need. Lend what you don't."),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Sign in to lend or borrow" }),
  ).toBeVisible();
});

test("private routes redirect when signed out", async ({ page }) => {
  await page.goto("/tools");
  await expect(page).toHaveURL(/sign-in/);
});
