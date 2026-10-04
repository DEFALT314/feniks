import { startTransition, type FormEvent } from "react";

/**
 * onSubmit for a `<form action={action}>` from useActionState that keeps what the user typed.
 * React resets a form after its action runs, so a failed sign-up lost the password and the
 * consent tick, and a failed message lost its text (WCAG 3.3.7 Redundant Entry). Calling the
 * action ourselves inside a transition skips that reset. Without JavaScript the plain `action`
 * still posts the form.
 */
export function submitKeepingValues(dispatch: (formData: FormData) => void) {
  return (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    // The pressed button's name/value (e.g. a decision) is part of the data, as in a normal submit
    const pressed = (event.nativeEvent as SubmitEvent).submitter;
    const submitter = pressed && pressed !== form && form.contains(pressed) ? pressed : null;
    const formData = new FormData(form, submitter);
    startTransition(() => dispatch(formData));
  };
}
