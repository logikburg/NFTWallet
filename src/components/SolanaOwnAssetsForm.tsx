/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import {
    address,
    appendTransactionMessageInstruction,
    assertIsTransactionMessageWithSingleSendingSigner,
    createTransactionMessage,
    isAddress,
    pipe,
    setTransactionMessageFeePayerSigner,
    setTransactionMessageLifetimeUsingBlockhash,
    signAndSendTransactionMessageWithSigners,
} from '@solana/web3.js';
import '../styles/style.css';

import {
    AspectRatio,
    Blockquote,
    Box,
    Button,
    CheckboxCards,
    DataList,
    Dialog,
    Flex,
    Text,
    TextField,
} from '@radix-ui/themes';
import { findAssociatedTokenPda, getTransferCheckedInstruction, TOKEN_PROGRAM_ADDRESS } from '@solana-program/token';
import { type UiWalletAccount } from '@wallet-standard/react';
import { SyntheticEvent, useContext, useEffect, useRef, useState } from 'react';
import useSWR, { mutate } from 'swr';
import { useWalletAccountTransactionSendingSigner } from '@solana/react';
import { ChainContext } from '../context/ChainContext';
import { RpcContext } from '../context/RpcContext';
import { ErrorDialog } from './ErrorDialog';
import { WarningDialog } from './WarningDialog';
import { Pencil1Icon } from '@radix-ui/react-icons';

type Props = Readonly<{
    account: UiWalletAccount;
}>;

const myAssets: any = [
    // {
    //     dna: '1234567890',
    //     imgSrc: '',
    //     name: 'test1',
    //     selected: false,
    // },
];

const fetcher = (url: string) => fetch(url).then(res => res.json());

export function SolanaOwnAssetsForm({ account }: Props) {
    const [assets, setAssets] = useState(myAssets);
    const [defaultValues, setDefaultValues] = useState<string[]>();
    const [transferItemSelected, setTransferItemSelected] = useState();
    const { rpc } = useContext(RpcContext);
    const { chain: currentChain, solanaExplorerClusterName } = useContext(ChainContext);
    const [canCallGetAssetsApi, setCanCallGetAssetsApi] = useState<boolean>(true);
    const transactionSendingSigner = useWalletAccountTransactionSendingSigner(account, currentChain);
    const [textAddress, setTextAddress] = useState<string>('');
    const { current: NO_ERROR } = useRef(Symbol());
    const [warning, setWarning] = useState(NO_ERROR);
    const [error, setError] = useState(NO_ERROR);
    const [lastMessage, setLastMessage] = useState<string>('');

    const onValueChangedCheckboxItem = (strs: string[]) => {
        assets.map(e => {
            e.selected = false;
        });

        strs.map((str: any) => {
            assets[str].selected = true;
        });

        setDefaultValues(strs);

        strs.length > 0 ? setTransferItemSelected(assets[strs[0]]) : {};
    };

    // only call GetAssets API when there is boolCallGetAssetsApi = true;
    // useEffect(() => {
    //     setBoolCallGetAssetsApi(false);
    // }, [boolCallGetAssetsApi]);

    const {
        data,
        error: error1,
        isLoading,
        mutate,
    } = useSWR(
        //account && canCallGetAssetsApi ? `http://localhost:3000/${account?.address}/getAssets` : null,
        account ? `http://localhost:3000/${account?.address}/getAssets` : null,
        fetcher,
    );

    useEffect(() => {
        //setCanCallGetAssetsApi(false);
        setAssets(data);
    }, [account, data]);

    const onMouseDownMint = (e: SyntheticEvent) => {
        //TO DO
        console.log('onMouseDownMint');
    };

    const onMouseDownTransfer = async (e: SyntheticEvent) => {
        //TO DO
        console.log('onMouseDownTransfer');
        mutate();
        try {
            if (defaultValues?.length == 1) await transferSPLToken(transferItemSelected, account);
            //else setWarning('Please select only One (1) asset for transfer');
            else throw new Error('Please select only One (1) asset for transfer');
        } catch (error) {
            console.log(error);
            setError(error);
        }
    };

    async function transferSPLToken(transferItemSelected: any, account: UiWalletAccount) {
        //const mint = address('8pgtyLWYWc4Kmzy7NyoTPAmBQp4VMrQ45TgwUh9ddJhq'); // ! update me
        const mint = address(transferItemSelected.publicKey); // ! update me
        const receiver = address('2SNBdEXUv3uuHyxgUtmbwFci2oWc4SxfUfmKkMVtTECh'); // ! update me
        const { value: latestBlockhash } = await rpc.getLatestBlockhash().send();
        const senderTokenAccount = (
            await findAssociatedTokenPda({
                owner: address(account.address),
                mint,
                tokenProgram: TOKEN_PROGRAM_ADDRESS,
            })
        )[0];
        const receiverTokenAccount = (
            await findAssociatedTokenPda({
                owner: receiver,
                mint,
                tokenProgram: TOKEN_PROGRAM_ADDRESS,
            })
        )[0];

        const transferIx = getTransferCheckedInstruction(
            {
                source: senderTokenAccount,
                mint: mint,
                destination: receiverTokenAccount,
                authority: address(account.address),
                amount: 1,
                decimals: 0,
            },
            {
                programAddress: TOKEN_PROGRAM_ADDRESS,
            },
        );

        const message = pipe(
            createTransactionMessage({ version: 0 }),
            m => setTransactionMessageFeePayerSigner(transactionSendingSigner, m),
            m => setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, m),
            m => appendTransactionMessageInstruction(transferIx, m),
        );
        assertIsTransactionMessageWithSingleSendingSigner(message);
        const signature = await signAndSendTransactionMessageWithSigners(message);
        void mutate({ address: transactionSendingSigner.address, chain: currentChain });
        void mutate({ address: receiverTokenAccount, chain: currentChain });
        console.log('signature', signature);
    }

    const onMouseDownSendToBattle = (e: SyntheticEvent) => {
        //TO DO
        console.log('Test onMouseDownSendToBattle');
    };

    if (error1) return 'An error has occurred.' + error1;
    if (isLoading) return 'Loading...';

    return (
        <Flex asChild gap="2" direction={{ initial: 'column', sm: 'row' }} style={{ width: '100%' }}>
            <form
                onSubmit={async e => {
                    e.preventDefault();
                    setError(NO_ERROR);
                    try {
                        // const signature = await signMessage(new TextEncoder().encode(text));
                    } catch (e) {
                        setError(e);
                    } finally {
                        //setIsSigningMessage(false);
                    }
                }}
            >
                <Box flexGrow="1">
                    <TextField.Root
                        placeholder="Write a message to sign"
                        onChange={(e: SyntheticEvent<HTMLInputElement>) => setTextAddress(e.currentTarget.value)}
                        value={textAddress}
                    >
                        <TextField.Slot>
                            <Pencil1Icon />
                        </TextField.Slot>
                    </TextField.Root>
                </Box>
                <Dialog.Root
                    open={!isAddress(textAddress)}
                    onOpenChange={open => {
                        if (!open) {
                        }
                    }}
                >
                    <Dialog.Trigger>
                        <Button color={error ? undefined : 'red'} disabled={!textAddress} type="submit">
                            Transfer
                        </Button>
                    </Dialog.Trigger>
                    {lastMessage ? (
                        <Dialog.Content
                            onClick={e => {
                                e.stopPropagation();
                            }}
                        >
                            <Dialog.Title>Message</Dialog.Title>
                            <DataList.Root orientation={{ initial: 'vertical', sm: 'horizontal' }}>
                                <DataList.Item>
                                    <DataList.Label minWidth="88px">Message</DataList.Label>
                                    <DataList.Value>
                                        <Blockquote>{textAddress}</Blockquote>
                                    </DataList.Value>
                                </DataList.Item>
                            </DataList.Root>
                            <Flex gap="3" mt="4" justify="end">
                                <Dialog.Close>
                                    <Button>Cool!</Button>
                                </Dialog.Close>
                            </Flex>
                        </Dialog.Content>
                    ) : null}
                </Dialog.Root>
                {error !== NO_ERROR ? (
                    <ErrorDialog error={error} onClose={() => setError(NO_ERROR)} title="Invalid Address" />
                ) : null}
            </form>
        </Flex>
    );
}
