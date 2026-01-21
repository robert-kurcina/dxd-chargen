'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getImageFromPrompt } from './actions';
import { Icons } from '@/components/icons';
import Image from 'next/image';
import { useToast } from '@/hooks/use-toast';

const initialPrompt = `Cinematic character portrait of a male Jarmaran Klenari rogue. He has a stocky, stout build and a disarmingly friendly round face with large, intelligent brown eyes and a slight smirk. His hair is thick, dark brown, and styled casually. He is dressed in expertly crafted, layered black leather armor, including ornate pauldrons and vambraces, held together by a network of brown leather straps and silver buckles. He stands confidently for a full-body shot against a plain, warm-toned studio background. Hyper-realistic 3D render, fantasy, detailed textures.`;

export default function ImageGenPage() {
  const [prompt, setPrompt] = useState(initialPrompt);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleGenerate = async () => {
    setIsLoading(true);
    setImageUrl(null);
    const result = await getImageFromPrompt(prompt);
    setIsLoading(false);

    if (result.error) {
      toast({
        variant: 'destructive',
        title: 'Error generating image',
        description: result.error,
      });
    } else if (result.imageUrl) {
      setImageUrl(result.imageUrl);
    }
  };

  return (
    <div className="max-w-[960px] mx-auto space-y-8">
      <Card>
        <CardHeader>
          <CardTitle>Image Generation</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Enter a prompt to generate an image..."
            rows={5}
            className="text-base"
          />
          <Button onClick={handleGenerate} disabled={isLoading}>
            {isLoading && <Icons.Loader className="animate-spin" />}
            {isLoading ? 'Generating...' : 'Generate Image'}
          </Button>
        </CardContent>
      </Card>

      {(isLoading || imageUrl) && (
        <Card>
          <CardHeader>
            <CardTitle>Result</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-center">
            {isLoading && (
              <div className="flex flex-col items-center gap-4 text-muted-foreground">
                <Icons.Loader className="animate-spin h-12 w-12" />
                <p>Generating image... this may take a moment.</p>
              </div>
            )}
            {imageUrl && (
              <Image
                src={imageUrl}
                alt="Generated character image"
                width={512}
                height={512}
                className="rounded-lg object-contain"
              />
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
