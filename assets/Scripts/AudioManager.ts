import { _decorator, Component, AudioSource, AudioClip, resources } from 'cc';

const { ccclass, property } = _decorator;

@ccclass('AudioManager')
export class AudioManager extends Component {
    @property(AudioSource)
    audioSource: AudioSource = null!;

    @property(AudioClip)
    swapSuccessSound: AudioClip = null!;

    @property(AudioClip)
    swapFailSound: AudioClip = null!;

    @property([AudioClip])
    destroyBlocksSounds: AudioClip[] = [];

    private static instance: AudioManager = null!;
    private lastDestroySoundIndex: number = -1;

    onLoad() {
        AudioManager.instance = this;
    }

    public static getInstance(): AudioManager {
        return AudioManager.instance;
    }

    /**
     * @en
     * Plays successful swap sound
     * @zh
     * 播放成功交换音效
     */
    public playSwapSuccess(): void {
        if (this.audioSource && this.swapSuccessSound) {
            this.audioSource.playOneShot(this.swapSuccessSound);
        }
    }

    /**
     * @en
     * Plays unsuccessful swap sound
     * @zh
     * 播放不成功交换音效
     */
    public playSwapFail(): void {
        if (this.audioSource && this.swapFailSound) {
            this.audioSource.playOneShot(this.swapFailSound);
        }
    }

    /**
     * @en
     * Plays random block destruction sound
     * Ensures the sound will be different from the previous one
     * @zh
     * 播放随机方块销毁音效
     * 确保音效与之前的音效不同
     */
    public playDestroyBlocks(): void {
        if (this.audioSource && this.destroyBlocksSounds.length > 0) {
            let randomIndex: number;
            
            if (this.destroyBlocksSounds.length === 1) {
                randomIndex = 0;
            } else {
                do {
                    randomIndex = Math.floor(Math.random() * this.destroyBlocksSounds.length);
                } while (randomIndex === this.lastDestroySoundIndex);
                
                this.lastDestroySoundIndex = randomIndex;
            }
            
            const selectedSound = this.destroyBlocksSounds[randomIndex];
            if (selectedSound) {
                this.audioSource.playOneShot(selectedSound);
            }
        }
    }












} 