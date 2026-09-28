import { Button } from '@mantine/core';
import { IconBookmark, IconCompass } from '@tabler/icons-react';

export function HeroIntro() {
    return (
        <section className="page-intro">
            <div>
                <div className="eyebrow">
                    <span className="eyebrow-line" /> TUESDAY, SEPTEMBER 25
                </div>
                <h1>
                    Find your next
                    <br />
                    <span>great game.</span>
                </h1>
                <p>
                    Your personal corner of the gaming universe. Curated picks, fresh releases, and
                    your growing collection—all in one place.
                </p>
                <div className="intro-actions">
                    <Button
                        className="primary-cta"
                        leftSection={<IconCompass size={17} />}
                        radius="md"
                    >
                        Explore games
                    </Button>
                    <button className="text-cta">
                        <IconBookmark size={17} /> View your wishlist
                    </button>
                </div>
            </div>
            <div className="hero-art">
                <div className="orbit orbit-one" />
                <div className="orbit orbit-two" />
                <div className="hero-sigil">✳</div>
                <span className="hero-kicker">YOUR NEXT ADVENTURE</span>
                <span className="hero-caption">
                    STARTS HERE <span>↗</span>
                </span>
                <div className="hero-tiny hero-tiny-one">✦</div>
                <div className="hero-tiny hero-tiny-two">✧</div>
            </div>
        </section>
    );
}
