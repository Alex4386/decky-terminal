import { DialogButton } from "decky-frontend-lib";

export function IconDialogButton(props: Parameters<typeof DialogButton>[0]): ReturnType<typeof DialogButton> {
  return <DialogButton
    {...{
      ...props,
      children: undefined,
      style: {
        minWidth: '0',
        width: '50px',
        padding: '10px',
        ...(props.style),
      }
    }}
  >
    {props.children}
  </DialogButton>
}