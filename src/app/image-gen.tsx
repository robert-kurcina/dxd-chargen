'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { getImageFromPrompt } from './actions';
import { useToast } from '@/hooks/use-toast';
import { Icons } from '@/components/icons';
import Image from 'next/image';

export default function ImageGen() {
    const [prompt, setPrompt] = useState('');
    const [imageUrl, setImageUrl] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const { toast } = useToast();

    const handleSubmit = async () => {
        if (!prompt) {
            toast({
                variant: 'destructive',
                title: 'Error',
                description: 'Please enter a prompt.',
            });
            return;
        }

        setLoading(true);
        setImageUrl(null);

        const result = await getImageFromPrompt({ prompt });

        setLoading(false);

        if (result.error) {
            toast({
                variant: 'destructive',
                title: 'Image Generation Failed',
                description: result.error,
            });
        } else if (result.imageUrl) {
            setImageUrl(result.imageUrl);
        }
    };

    return (
        <div className="max-w-[960px] mx-auto space-y-8 mt-4">
            <Card>
                <CardHeader>
                    <CardTitle>Image Generation</CardTitle>
                    <CardDescription>
                        Enter a prompt to generate an image using AI. This uses the Imagen 4 model.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <Input
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        placeholder="e.g., A majestic dragon soaring over a mystical forest at dawn."
                        disabled={loading}
                    />
                     <Button onClick={handleSubmit} disabled={loading}>
                        {loading ? (
                            <>
                                <Icons.Loader className="animate-spin mr-2" />
                                Generating...
                            </>
                        ) : (
                            'Generate Image'
                        )}
                    </Button>
                </CardContent>
                <CardFooter>
                    {imageUrl && (
                        <div className="mt-4 border rounded-lg overflow-hidden w-full">
                           <Image
                                src={imageUrl}
                                alt={prompt}
                                width={512}
                                height={512}
                                className="w-full h-auto object-contain"
                            />
                        </div>
                    )}
                </CardFooter>
            </Card>
        </div>
    );
}
