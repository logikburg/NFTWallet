import { AlertDialog, Blockquote, Button, Flex } from '@radix-ui/themes';
import React, { useState } from 'react';

import { getErrorMessage } from '../errors';
import { Code } from '@radix-ui/themes/src/index.js';

type Props = Readonly<{
    warning: any;
    makeOpen: boolean;
    onClose?(): false | void;
    title?: string;
}>;

export function WarningDialog({ warning, makeOpen, onClose, title }: Props) {
    const [isOpen, setIsOpen] = useState(false);
    return (
        <AlertDialog.Root
            open={isOpen || makeOpen}
            onOpenChange={open => {
                if (!open) {
                    if (!onClose || onClose() !== false) {
                        setIsOpen(false);
                        makeOpen = false;
                    }
                }
            }}
        >
            <AlertDialog.Content>
                <AlertDialog.Title color="red">{title ?? 'We encountered the following warning(s)'}</AlertDialog.Title>
                <AlertDialog.Description>
                    <Blockquote><React.Fragment >
                            <Code>{warning}</Code>
                        </React.Fragment></Blockquote>
                </AlertDialog.Description>
                <Flex mt="4" justify="end">
                    <AlertDialog.Action>
                        <Button variant="solid">Close</Button>
                    </AlertDialog.Action>
                </Flex>
            </AlertDialog.Content>
        </AlertDialog.Root>
    );
}
