'use client';

import React, { useState, useEffect, useMemo, useTransition } from 'react';
import Image from 'next/image';
import {
  ATTRIBUTES,
  SKILLS,
  SOCIAL_RANKS,
  BASE_TALENTS,
  type Attribute,
} from '@/lib/character-data';
import { getTalentSuggestions } from '@/app/actions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Icons } from '@/components/icons';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { cn } from '@/lib/utils';

type AttributesState = Record<Attribute, number>;

const initialAttributes: AttributesState = (Object.keys(ATTRIBUTES) as Attribute[]).reduce(
  (acc, key) => {
    acc[key] = 5;
    return acc;
  },
  {} as AttributesState
);

export default function CharacterForgePage() {
  const [attributes, setAttributes] = useState<AttributesState>(initialAttributes);
  const [aiTalents, setAiTalents] = useState<string[]>([]);
  const [isGenerating, startAttributeTransition] = useTransition();
  const [isSuggesting, startSuggestionTransition] = useTransition();
  const [key, setKey] = useState(0);

  const { toast } = useToast();

  const heroImage = PlaceHolderImages.find(img => img.id === 'character-forge-hero');

  const handleGenerateAttributes = () => {
    startAttributeTransition(() => {
      const newAttributes = { ...attributes };
      for (const attr in newAttributes) {
        newAttributes[attr as Attribute] = Math.floor(Math.random() * 10) + 1;
      }
      setAttributes(newAttributes);
      setKey(prev => prev + 1); // For re-triggering animations
    });
  };

  useEffect(() => {
    handleGenerateAttributes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const derivedData = useMemo(() => {
    const total = Object.values(attributes).reduce((sum, val) => sum + val, 0);

    const skills = Object.entries(SKILLS).reduce((acc, [skill, { attribute }]) => {
      acc[skill] = Math.floor(attributes[attribute] / 2);
      return acc;
    }, {} as Record<string, number>);

    const socialRank =
      SOCIAL_RANKS.find(rank => total >= rank.threshold) || SOCIAL_RANKS[SOCIAL_RANKS.length - 1];

    const baseTalents = Object.entries(BASE_TALENTS)
      .filter(([, { attribute, threshold }]) => attributes[attribute] >= threshold)
      .map(([talent]) => talent);

    return { skills, socialRank, baseTalents };
  }, [attributes]);

  const handleSuggestTalents = async () => {
    startSuggestionTransition(async () => {
      setAiTalents([]);
      const result = await getTalentSuggestions({
        attributes,
        skills: derivedData.skills,
      });

      if (result.error) {
        toast({
          variant: 'destructive',
          title: 'AI Suggestion Failed',
          description: result.error,
        });
      } else if (result.talents) {
        setAiTalents(result.talents);
      }
    });
  };

  return (
    <div className="relative min-h-screen w-full bg-background font-body">
      <header className="relative h-60 md:h-80 w-full">
        {heroImage && (
          <Image
            src={heroImage.imageUrl}
            alt={heroImage.description}
            data-ai-hint={heroImage.imageHint}
            fill
            className="object-cover"
            priority
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-transparent" />
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4">
          <h1 className="font-headline text-5xl md:text-7xl font-bold text-primary drop-shadow-md">
            Sarna Len Character Forge
          </h1>
          <p className="mt-4 text-lg md:text-xl text-foreground/80 max-w-2xl">
            Forge your next RPG character with a dash of randomness and a spark of AI creativity.
          </p>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="flex justify-center mb-8">
          <Button size="lg" onClick={handleGenerateAttributes} disabled={isGenerating}>
            {isGenerating ? (
              <Icons.Loader className="animate-spin" />
            ) : (
              <Icons.Dices />
            )}
            Generate Attributes
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          <div className="lg:col-span-2 space-y-8">
            <Card className="overflow-hidden shadow-lg" key={`attributes-${key}`}>
              <CardHeader>
                <CardTitle className="font-headline text-3xl">Attributes</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-6">
                {(Object.keys(ATTRIBUTES) as Attribute[]).map(attr => (
                  <div
                    key={attr}
                    className="flex items-center space-x-4 animate-in fade-in-50 slide-in-from-bottom-2 duration-500"
                  >
                    <div className="p-3 bg-secondary rounded-lg">
                      {React.createElement(Icons[ATTRIBUTES[attr]], { className: 'h-6 w-6 text-primary' })}
                    </div>
                    <div>
                      <p className="font-bold text-lg">{ATTRIBUTES[attr]}</p>
                      <p className="font-headline text-4xl font-semibold text-accent">{attributes[attr]}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="overflow-hidden shadow-lg" key={`skills-${key}`}>
              <CardHeader>
                <CardTitle className="font-headline text-3xl">Skills</CardTitle>
                <CardDescription>Derived from your attributes (Attribute / 2)</CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-4">
                {Object.entries(derivedData.skills).map(([skill, value]) => (
                  <div key={skill} className="flex justify-between items-baseline animate-in fade-in-50 slide-in-from-bottom-2 duration-700">
                    <span className="text-foreground/90">{skill}</span>
                    <span className="font-bold text-lg text-primary">{value}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-8">
            <Card className="shadow-lg" key={`rank-${key}`}>
              <CardHeader className="text-center animate-in fade-in-50 slide-in-from-bottom-2 duration-500">
                <p className="text-sm font-medium text-muted-foreground">Social Rank</p>
                <CardTitle className="font-headline text-4xl text-primary">{derivedData.socialRank.name}</CardTitle>
                <CardDescription>{derivedData.socialRank.description}</CardDescription>
              </CardHeader>
            </Card>

            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="font-headline text-3xl">Talents</CardTitle>
                <CardDescription>Special abilities for your character.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h4 className="font-bold mb-2">Base Talents</h4>
                  <div className="flex flex-wrap gap-2" key={`base-talents-${key}`}>
                    {derivedData.baseTalents.length > 0 ? (
                      derivedData.baseTalents.map(talent => (
                        <Badge key={talent} variant="secondary" className="animate-in fade-in duration-1000">
                          {talent}
                        </Badge>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground">None at this level.</p>
                    )}
                  </div>
                </div>
                <Separator />
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="font-bold">AI Suggestions</h4>
                    <Button variant="outline" size="sm" onClick={handleSuggestTalents} disabled={isSuggesting}>
                      {isSuggesting ? (
                        <Icons.Loader className="animate-spin" />
                      ) : (
                        <Icons.Sparkles />
                      )}
                      Suggest
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {isSuggesting && (
                      <>
                        <Skeleton className="h-5 w-3/4" />
                        <Skeleton className="h-5 w-1/2" />
                        <Skeleton className="h-5 w-2/3" />
                      </>
                    )}
                    {!isSuggesting && aiTalents.length > 0 &&
                      aiTalents.map((talent, index) => (
                        <div key={index} className={cn("flex items-start space-x-2 p-2 rounded-md hover:bg-secondary/50", "animate-in fade-in-0 slide-in-from-bottom-2 duration-300")} style={{ animationDelay: `${index * 100}ms`}}>
                          <Icons.ChevronRight className="h-5 w-5 mt-0.5 text-accent flex-shrink-0" />
                          <p className="text-sm">{talent}</p>
                        </div>
                      ))}
                    {!isSuggesting && aiTalents.length === 0 && (
                      <p className="text-sm text-muted-foreground p-2">
                        Click "Suggest" to get AI-powered talent ideas.
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
